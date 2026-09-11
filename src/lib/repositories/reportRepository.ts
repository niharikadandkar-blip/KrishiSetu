import { db } from '@/lib/db';
import { ReportItem, ReportCategory, ReportStatus, ModerationNoteItem } from '@/lib/types/phase10';

export const reportRepository = {
  async createReport(data: {
    reporterId: string;
    reportedUserId?: string | null;
    reportedProviderId?: string | null;
    orderId?: string | null;
    offerId?: string | null;
    lotId?: string | null;
    category: ReportCategory;
    description: string;
  }): Promise<ReportItem> {
    const created = await db.report.create({
      data: {
        reporterId: data.reporterId,
        reportedUserId: data.reportedUserId || null,
        reportedProviderId: data.reportedProviderId || null,
        orderId: data.orderId || null,
        offerId: data.offerId || null,
        lotId: data.lotId || null,
        category: data.category,
        description: data.description,
        status: 'OPEN',
      },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
        reportedProvider: { select: { businessName: true, contactName: true } },
        moderationNotes: {
          include: { reviewer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.mapReport(created);
  },

  async getReportById(id: string): Promise<ReportItem | null> {
    const report = await db.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
        reportedProvider: { select: { businessName: true, contactName: true } },
        moderationNotes: {
          include: { reviewer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) return null;
    return this.mapReport(report);
  },

  async getUserReports(reporterId: string): Promise<ReportItem[]> {
    const reports = await db.report.findMany({
      where: { reporterId },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
        reportedProvider: { select: { businessName: true, contactName: true } },
        moderationNotes: {
          include: { reviewer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => this.mapReport(r));
  },

  async getAdminReports(options: {
    status?: ReportStatus;
    category?: ReportCategory;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ reports: ReportItem[]; total: number }> {
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.category) where.category = options.category;

    const [records, total] = await Promise.all([
      db.report.findMany({
        where,
        include: {
          reporter: { select: { name: true } },
          reportedUser: { select: { name: true } },
          reportedProvider: { select: { businessName: true, contactName: true } },
          moderationNotes: {
            include: { reviewer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      db.report.count({ where }),
    ]);

    return {
      reports: records.map((r) => this.mapReport(r)),
      total,
    };
  },

  async updateReportStatus(
    id: string,
    status: ReportStatus,
    reviewerId: string,
    moderationNote?: string
  ): Promise<ReportItem> {
    const report = await db.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    const isResolved = status === 'RESOLVED' || status === 'DISMISSED';

    const updated = await db.$transaction(async (tx) => {
      if (moderationNote && moderationNote.trim().length > 0) {
        await tx.moderationNote.create({
          data: {
            reportId: id,
            reviewerId,
            note: moderationNote.trim(),
          },
        });
      }

      return tx.report.update({
        where: { id },
        data: {
          status,
          resolvedAt: isResolved ? new Date() : null,
        },
        include: {
          reporter: { select: { name: true } },
          reportedUser: { select: { name: true } },
          reportedProvider: { select: { businessName: true, contactName: true } },
          moderationNotes: {
            include: { reviewer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    return this.mapReport(updated);
  },

  mapReport(raw: any): ReportItem {
    const moderationNotes: ModerationNoteItem[] = (raw.moderationNotes || []).map((m: any) => ({
      id: m.id,
      reportId: m.reportId,
      reviewerId: m.reviewerId,
      reviewerName: m.reviewer?.name,
      note: m.note,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: raw.id,
      reporterId: raw.reporterId,
      reporterName: raw.reporter?.name,
      reportedUserId: raw.reportedUserId || null,
      reportedUserName: raw.reportedUser?.name,
      reportedProviderId: raw.reportedProviderId || null,
      reportedProviderName: raw.reportedProvider?.businessName || raw.reportedProvider?.contactName,
      orderId: raw.orderId || null,
      offerId: raw.offerId || null,
      lotId: raw.lotId || null,
      category: raw.category as ReportCategory,
      description: raw.description,
      status: raw.status as ReportStatus,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      resolvedAt: raw.resolvedAt ? raw.resolvedAt.toISOString() : null,
      moderationNotes,
    };
  },
};
