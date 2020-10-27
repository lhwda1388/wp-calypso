/**
 * External dependencies
 */
import React from 'react';
import { useSelector } from 'react-redux';

/**
 * Internal dependencies
 */
import { useApplySiteOffset } from 'calypso/components/site-offset';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import { isActivityBackup, isSuccessfulRealtimeBackup } from 'calypso/lib/jetpack/backup-utils';
import getSelectedSiteId from 'calypso/state/ui/selectors/get-selected-site-id';
import BackupDelta from 'calypso/components/jetpack/backup-delta';
import MostRecentStatus from 'calypso/components/jetpack/daily-backup-status';
import { useActivityLogs, useBackupDeltas, useLatestBackupAttempt } from './hooks';

export const DailyStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const lastBackupBeforeDate = useLatestBackupAttempt( siteId, {
		before: moment( selectedDate ).startOf( 'day' ),
		successOnly: true,
	} );
	const lastAttemptOnDate = useLatestBackupAttempt( siteId, {
		after: moment( selectedDate ).startOf( 'day' ),
		before: moment( selectedDate ).endOf( 'day' ),
	} );

	const hasPreviousBackup = ! lastBackupBeforeDate.isLoading && lastBackupBeforeDate.backupAttempt;
	const successfulLastAttempt =
		! lastAttemptOnDate.isLoading && lastAttemptOnDate.backupAttempt?.activityIsRewindable;

	const { deltas, isLoadingDeltas } = useBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				before: moment( lastAttemptOnDate.backupAttempt.activityTs ),
				after: moment( lastBackupBeforeDate.backupAttempt.activityTs ),
			}
	);

	if ( lastBackupBeforeDate.isLoading || lastAttemptOnDate.isLoading || isLoadingDeltas ) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	return (
		<MostRecentStatus
			{ ...{
				selectedDate,
				lastBackupDate:
					lastBackupBeforeDate.backupAttempt &&
					applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
				backup: lastAttemptOnDate.backupAttempt,
				deltas,
			} }
		/>
	);
};

export const RealtimeStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const { activityLogs, isLoadingActivityLogs } = useActivityLogs( siteId, {
		before: moment( selectedDate ).endOf( 'day' ).toISOString(),
		after: moment( selectedDate ).startOf( 'day' ).toISOString(),
	} );

	const lastBackupBeforeDate = useLatestBackupAttempt( siteId, {
		before: moment( selectedDate ).startOf( 'day' ),
		successOnly: true,
	} );

	if ( isLoadingActivityLogs || lastBackupBeforeDate.isLoading ) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	const realtimeBackupsOnDate = activityLogs.filter(
		( activity ) => isActivityBackup( activity ) || isSuccessfulRealtimeBackup( activity )
	);

	return (
		<>
			<MostRecentStatus
				{ ...{
					selectedDate,
					lastBackupDate:
						lastBackupBeforeDate.backupAttempt &&
						applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
					backup: realtimeBackupsOnDate[ 0 ],
				} }
			/>

			{ realtimeBackupsOnDate.length && (
				<BackupDelta
					{ ...{
						realtimeBackups: realtimeBackupsOnDate.slice( 1 ),
						isToday: moment().isSame( selectedDate, 'day' ),
					} }
				/>
			) }
		</>
	);
};
