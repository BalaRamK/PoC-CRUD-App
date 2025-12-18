const express = require('express');
const router = express.Router();

// In-memory storage for scheduled reports (replace with database in production)
let scheduledReports = [];
let reportIdCounter = 1;

/**
 * GET /api/reports/scheduled
 * Get all scheduled reports
 */
router.get('/scheduled', (req, res) => {
  try {
    res.json({
      success: true,
      data: scheduledReports
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled reports',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/scheduled
 * Create a new scheduled report configuration
 */
router.post('/scheduled', (req, res) => {
  try {
    const {
      reportName,
      reportDescription,
      dataSource,
      jiraProject,
      visualizationType,
      filters,
      deliveryMethod,
      emailRecipients,
      scheduleEnabled,
      scheduleFrequency,
      scheduleDayOfWeek,
      scheduleDayOfMonth,
      scheduleTime
    } = req.body;

    // Validate required fields
    if (!reportName) {
      return res.status(400).json({
        success: false,
        message: 'Report name is required'
      });
    }

    if (!dataSource || !['poc', 'jira'].includes(dataSource)) {
      return res.status(400).json({
        success: false,
        message: 'Valid data source (poc or jira) is required'
      });
    }

    if (dataSource === 'jira' && !jiraProject) {
      return res.status(400).json({
        success: false,
        message: 'Jira project is required when data source is jira'
      });
    }

    if (!deliveryMethod || !['download', 'email'].includes(deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Valid delivery method (download or email) is required'
      });
    }

    if (deliveryMethod === 'email' && (!emailRecipients || emailRecipients.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Email recipients are required when delivery method is email'
      });
    }

    const newReport = {
      id: reportIdCounter++,
      reportName,
      reportDescription: reportDescription || '',
      dataSource,
      jiraProject: dataSource === 'jira' ? jiraProject : null,
      visualizationType: visualizationType || 'table',
      filters: filters || [],
      deliveryMethod,
      emailRecipients: deliveryMethod === 'email' ? emailRecipients : [],
      scheduleEnabled: scheduleEnabled || false,
      scheduleFrequency: scheduleEnabled ? scheduleFrequency : null,
      scheduleDayOfWeek: scheduleEnabled && scheduleFrequency === 'weekly' ? scheduleDayOfWeek : null,
      scheduleDayOfMonth: scheduleEnabled && scheduleFrequency === 'monthly' ? scheduleDayOfMonth : null,
      scheduleTime: scheduleEnabled ? scheduleTime : null,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: scheduleEnabled ? calculateNextRun(scheduleFrequency, scheduleDayOfWeek, scheduleDayOfMonth, scheduleTime) : null,
      status: 'active'
    };

    scheduledReports.push(newReport);

    res.json({
      success: true,
      message: 'Report scheduled successfully',
      data: newReport
    });
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduled report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/scheduled/:id
 * Get a specific scheduled report
 */
router.get('/scheduled/:id', (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = scheduledReports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled report',
      error: error.message
    });
  }
});

/**
 * PUT /api/reports/scheduled/:id
 * Update a scheduled report
 */
router.put('/scheduled/:id', (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const reportIndex = scheduledReports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    const updatedReport = {
      ...scheduledReports[reportIndex],
      ...req.body,
      id: reportId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    // Recalculate next run if schedule settings changed
    if (updatedReport.scheduleEnabled) {
      updatedReport.nextRun = calculateNextRun(
        updatedReport.scheduleFrequency,
        updatedReport.scheduleDayOfWeek,
        updatedReport.scheduleDayOfMonth,
        updatedReport.scheduleTime
      );
    } else {
      updatedReport.nextRun = null;
    }

    scheduledReports[reportIndex] = updatedReport;

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled report',
      error: error.message
    });
  }
});

/**
 * DELETE /api/reports/scheduled/:id
 * Delete a scheduled report
 */
router.delete('/scheduled/:id', (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const reportIndex = scheduledReports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    const deletedReport = scheduledReports.splice(reportIndex, 1)[0];

    res.json({
      success: true,
      message: 'Report deleted successfully',
      data: deletedReport
    });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled report',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/run/:id
 * Manually trigger a scheduled report
 */
router.post('/run/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = scheduledReports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    // TODO: Implement actual report generation logic
    // This would fetch data, apply filters, generate visualization, and deliver via email/download
    
    // Update last run time
    const reportIndex = scheduledReports.findIndex(r => r.id === reportId);
    scheduledReports[reportIndex].lastRun = new Date().toISOString();

    res.json({
      success: true,
      message: 'Report execution triggered',
      data: {
        reportId,
        executedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error running scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run scheduled report',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/send/:id
 * Send a report immediately via email
 */
router.post('/send/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = scheduledReports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    if (report.deliveryMethod !== 'email' || !report.emailRecipients || report.emailRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report is not configured for email delivery or has no recipients'
      });
    }

    // TODO: Implement actual email sending logic
    // This would:
    // 1. Fetch data from appropriate source (POC/Jira)
    // 2. Apply filters
    // 3. Generate CSV/visualization
    // 4. Send email using nodemailer or similar service
    // For now, we'll simulate success
    
    console.log(`Sending email report "${report.reportName}" to:`, report.emailRecipients);
    
    // Update last run time
    const reportIndex = scheduledReports.findIndex(r => r.id === reportId);
    scheduledReports[reportIndex].lastRun = new Date().toISOString();

    res.json({
      success: true,
      message: `Report sent successfully to ${report.emailRecipients.length} recipient(s)`,
      data: {
        reportId,
        reportName: report.reportName,
        recipients: report.emailRecipients,
        sentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send report',
      error: error.message
    });
  }
});

/**
 * Helper function to calculate next run time
 */
function calculateNextRun(frequency, dayOfWeek, dayOfMonth, time) {
  const now = new Date();
  const [hours, minutes] = (time || '09:00').split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      const daysOfWeek = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
      const targetDay = daysOfWeek[dayOfWeek || 'monday'];
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      const targetDate = parseInt(dayOfMonth || '1');
      nextRun.setDate(targetDate);
      
      // If date has passed this month, move to next month
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;

    default:
      return null;
  }

  return nextRun.toISOString();
}

module.exports = router;
