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
import MostRecentStatus from 'calypso/components/jetpack/daily-backup-status/index-alternate';
import BackupCard from 'calypso/components/jetpack/backup-card';
import { useActivityLogs, useLatestBackupAttempt, useRawBackupDeltas } from './hooks';

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
	const mostRecentBackupEver = useLatestBackupAttempt( siteId, {
		successOnly: true,
	} );

	const hasPreviousBackup = ! lastBackupBeforeDate.isLoading && lastBackupBeforeDate.backupAttempt;
	const successfulLastAttempt =
		! lastAttemptOnDate.isLoading && lastAttemptOnDate.backupAttempt?.activityIsRewindable;
	const { deltas, isLoadingDeltas } = useRawBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				after: moment( lastBackupBeforeDate.backupAttempt.activityTs ),
				before: moment( lastAttemptOnDate.backupAttempt.activityTs ),
			}
	);

	if (
		lastBackupBeforeDate.isLoading ||
		lastAttemptOnDate.isLoading ||
		mostRecentBackupEver.isLoading ||
		isLoadingDeltas
	) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	const isLatestBackup =
		lastAttemptOnDate.backupAttempt &&
		mostRecentBackupEver.backupAttempt &&
		lastAttemptOnDate.backupAttempt.rewindId === mostRecentBackupEver.backupAttempt.rewindId;

	return (
		<ul className="backup__card-list">
			<li key="daily-backup-status">
				<MostRecentStatus
					{ ...{
						selectedDate,
						lastBackupDate:
							lastBackupBeforeDate.backupAttempt &&
							applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
						backup: lastAttemptOnDate.backupAttempt,
						isLatestBackup,
						dailyDeltas: deltas,
					} }
				/>
			</li>
		</ul>
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

	const mostRecentBackupEver = useLatestBackupAttempt( siteId, {
		successOnly: true,
	} );

	const backupAttemptsOnDate = activityLogs.filter(
		( activity ) => isActivityBackup( activity ) || isSuccessfulRealtimeBackup( activity )
	);
	const lastAttemptOnDate = backupAttemptsOnDate[ 0 ];

	const hasPreviousBackup = ! lastBackupBeforeDate.isLoading && lastBackupBeforeDate.backupAttempt;
	const successfulLastAttempt =
		lastAttemptOnDate && isSuccessfulRealtimeBackup( lastAttemptOnDate );

	const { deltas, isLoadingDeltas } = useRawBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				before: applySiteOffset( lastAttemptOnDate.activityTs ),
				after: applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
			}
	);

	if (
		isLoadingActivityLogs ||
		lastBackupBeforeDate.isLoading ||
		mostRecentBackupEver.isLoading ||
		isLoadingDeltas
	) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	const isLatestBackup =
		mostRecentBackupEver.backupAttempt &&
		lastAttemptOnDate &&
		mostRecentBackupEver.backupAttempt.activityId === lastAttemptOnDate.activityId;

	return (
		<ul className="backup__card-list">
			<li key="daily-backup-status">
				<MostRecentStatus
					{ ...{
						selectedDate,
						lastBackupDate:
							lastBackupBeforeDate.backupAttempt &&
							applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
						backup: lastAttemptOnDate,
						isLatestBackup,
						dailyDeltas: deltas,
					} }
				/>
			</li>

			{ backupAttemptsOnDate.slice( 1 ).map( ( activity ) => (
				<li key={ activity.activityId }>
					<BackupCard activity={ activity } />
				</li>
			) ) }
		</ul>
	);
};
