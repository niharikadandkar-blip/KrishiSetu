import { reportRepository } from '@/lib/repositories/reportRepository';
import { notificationRepository } from '@/lib/repositories/notificationRepository';
import { ReportItem, ReportCategory, ReportStatus } from '@/lib/types/phase10';

export const reportService = {
  async createReport(
    reporterId: string,
    params: {
      reportedUserId?: string;
      reportedProviderId?: string;
      orderId?: string;
      offerId?: string;
      lotId?: string;
      category: ReportCategory;
      description: string;
    }
  ): Promise<ReportItem> {
    if (!params.description || params.description.trim().length < 10) {
      throw new Error('Description must be at least 10 characters long');
    }

    const report = await reportRepository.createReport({
      reporterId,
      reportedUserId: params.reportedUserId,
      reportedProviderId: params.reportedProviderId,
      orderId: params.orderId,
      offerId: params.offerId,
      lotId: params.lotId,
      category: params.category,
      description: params.description.trim(),
    });

    // Notify reporter that report has been received
    await notificationRepository.createNotification({
      userId: reporterId,
      type: 'REPORT_SUBMITTED',
      category: 'SUPPORT',
      priority: 'NORMAL',
      titleKey: 'notifications.reportSubmittedTitle',
      messageKey: 'notifications.reportSubmittedMsg',
      payload: {
        reportId: report.id,
        category: report.category,
      },
      deepLink: `/reports/${report.id}`,
      sourceEntityType: 'REPORT',
      sourceEntityId: report.id,
      idempotencyKey: `report-sub-${report.id}`,
    });

    return report;
  },

  async getReportById(reportId: string, requestingUserId: string, requestingUserRole: string): Promise<ReportItem> {
    const report = await reportRepository.getReportById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const isAdmin = requestingUserRole === 'ADMIN';
    const isReporter = report.reporterId === requestingUserId;

    if (!isAdmin && !isReporter) {
      throw new Error('UNAUTHORIZED_IDOR: Cannot access report filed by another user.');
    }

    return report;
  },

  async getUserReports(reporterId: string): Promise<ReportItem[]> {
    return reportRepository.getUserReports(reporterId);
  },

  async getAdminReports(
    requestingUserRole: string,
    options: { status?: ReportStatus; category?: ReportCategory; limit?: number; offset?: number } = {}
  ): Promise<{ reports: ReportItem[]; total: number }> {
    if (requestingUserRole !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: ADMIN access required');
    }

    return reportRepository.getAdminReports(options);
  },

  async updateReportStatus(
    adminUserId: string,
    adminUserRole: string,
    reportId: string,
    params: { status: ReportStatus; moderationNote?: string }
  ): Promise<ReportItem> {
    if (adminUserRole !== 'ADMIN') {
      throw new Error('UNAUTHORIZED: ADMIN access required');
    }

    const updated = await reportRepository.updateReportStatus(
      reportId,
      params.status,
      adminUserId,
      params.moderationNote
    );

    // Notify reporter of status update
    await notificationRepository.createNotification({
      userId: updated.reporterId,
      type: 'REPORT_STATUS_UPDATED',
      category: 'SUPPORT',
      priority: 'HIGH',
      titleKey: 'notifications.reportUpdatedTitle',
      messageKey: 'notifications.reportUpdatedMsg',
      payload: {
        reportId: updated.id,
        status: updated.status,
      },
      deepLink: `/reports/${updated.id}`,
      sourceEntityType: 'REPORT',
      sourceEntityId: updated.id,
    });

    return updated;
  },
};
