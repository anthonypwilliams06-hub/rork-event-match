import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { supabase } from '@/lib/supabase';

export const listReportsProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List reports');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const reports = await db.getAllReports();

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporter = await db.getUserById(report.reporterId);
        const reported = await db.getUserById(report.reportedId);
        const reporterProfile = await db.getProfileByUserId(report.reporterId);
        const reportedProfile = await db.getProfileByUserId(report.reportedId);

        return {
          ...report,
          reporterName: reporter?.name || 'Unknown',
          reportedName: reported?.name || 'Unknown',
          reporterPhoto: reporterProfile?.photoUrl || null,
          reportedPhoto: reportedProfile?.photoUrl || null,
        };
      })
    );

    console.log('Reports fetched:', reportsWithDetails.length);
    return reportsWithDetails;
  });
