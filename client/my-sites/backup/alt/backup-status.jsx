/**
 * External dependencies
 */
import React from 'react';
import { useSelector } from 'react-redux';
import page from 'page';

/**
 * Internal dependencies
 */
import { useApplySiteOffset } from 'calypso/components/site-offset';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import {
	isActivityBackup,
	isSuccessfulDailyBackup,
	isSuccessfulRealtimeBackup,
	INDEX_FORMAT,
} from 'calypso/lib/jetpack/backup-utils';
import getDoesRewindNeedCredentials from 'calypso/state/selectors/get-does-rewind-need-credentials';
import getRewindCapabilities from 'calypso/state/selectors/get-rewind-capabilities';
import { getSelectedSiteId, getSelectedSiteSlug } from 'calypso/state/ui/selectors';
import QueryRewindCapabilities from 'calypso/components/data/query-rewind-capabilities';
import QueryRewindState from 'calypso/components/data/query-rewind-state';
import BackupDelta from 'calypso/components/jetpack/backup-delta';
import { backupMainPath } from '../paths';
import MostRecentStatus from 'calypso/components/jetpack/daily-backup-status';
import DatePicker from './date-picker';
import EnableRestoresBanner from '../enable-restores-banner';
import { useActivityLogs, useBackupAttempts, useBackupDeltas } from './hooks';

const BackupStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );
	const hasRealtime = useSelector(
		( state ) => getRewindCapabilities( state, siteId )?.includes?.( 'backup-realtime' ) || false
	);

	return (
		<Wrapper selectedDate={ selectedDate }>
			<QueryRewindCapabilities siteId={ siteId } />
			{ hasRealtime ? (
				<RealtimeStatus selectedDate={ selectedDate } />
			) : (
				<DailyStatus selectedDate={ selectedDate } />
			) }
		</Wrapper>
	);
};

const byActivityTsDescending = ( a, b ) => ( a.activityTs > b.activityTs ? -1 : 1 );

const DailyStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const { backupAttempts, isLoadingBackupAttempts } = useBackupAttempts( siteId, {
		before: moment( selectedDate ).endOf( 'day' ),
		number: 30,
	} );

	backupAttempts.sort( byActivityTsDescending );

	const lastBackupAttempt = backupAttempts
		.filter( ( backup ) => applySiteOffset( backup.activityTs ).isSame( selectedDate, 'day' ) )
		.sort( byActivityTsDescending )[ 0 ];
	const lastSuccessfulPastAttempt = backupAttempts
		.filter( isSuccessfulDailyBackup )
		.filter(
			( backup ) => applySiteOffset( backup.activityTs ) < moment( selectedDate ).startOf( 'day' )
		)[ 0 ];

	const { deltas, isLoadingDeltas } = useBackupDeltas( siteId, {
		before: lastBackupAttempt && applySiteOffset( lastBackupAttempt.activityTs ),
		after: lastSuccessfulPastAttempt && applySiteOffset( lastSuccessfulPastAttempt.activityTs ),
	} );

	if ( isLoadingBackupAttempts || isLoadingDeltas ) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	return (
		<MostRecentStatus
			{ ...{
				selectedDate,
				lastBackupDate:
					lastSuccessfulPastAttempt && applySiteOffset( lastSuccessfulPastAttempt.activityTs ),
				backup: lastBackupAttempt,
				deltas,
			} }
		/>
	);
};

const RealtimeStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const {
		backupAttempts: previousFullBackupAttempts,
		isLoadingAttempts: isLoadingPreviousAttempts,
	} = useBackupAttempts( siteId, {
		before: moment( selectedDate ).startOf( 'day' ),
		number: 30,
	} );

	const { activityLogs, isLoadingActivityLogs } = useActivityLogs( siteId, {
		before: moment( selectedDate ).endOf( 'day' ).toISOString(),
		after: moment( selectedDate ).startOf( 'day' ).toISOString(),
	} );

	if ( isLoadingActivityLogs || isLoadingPreviousAttempts ) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	activityLogs.sort( byActivityTsDescending );

	const lastBackupAttempt = activityLogs
		.filter( ( activity ) => applySiteOffset( activity.activityTs ).isSame( selectedDate, 'day' ) )
		.filter( ( activity ) => isActivityBackup( activity ) || activity.activityIsRewindable )
		.sort( byActivityTsDescending )[ 0 ];
	const lastSuccessfulPastAttempt = previousFullBackupAttempts
		.filter( isSuccessfulDailyBackup )
		.filter(
			( backup ) => applySiteOffset( backup.activityTs ) < moment( selectedDate ).startOf( 'day' )
		)[ 0 ];

	const otherRealtimeBackupActivities = activityLogs
		.filter(
			( activity ) => isActivityBackup( activity ) || isSuccessfulRealtimeBackup( activity )
		)
		.filter( ( activity ) => activity.activityId !== lastBackupAttempt?.activityId )
		.filter( ( activity ) => applySiteOffset( activity.activityTs ).isSame( selectedDate, 'day' ) );

	return (
		<>
			<MostRecentStatus
				{ ...{
					selectedDate,
					lastBackupDate:
						lastSuccessfulPastAttempt && applySiteOffset( lastSuccessfulPastAttempt.activityTs ),
					backup: lastBackupAttempt,
				} }
			/>

			{ lastBackupAttempt && (
				<BackupDelta
					{ ...{
						realtimeBackups: otherRealtimeBackupActivities,
						isToday: moment().isSame( selectedDate, 'day' ),
					} }
				/>
			) }
		</>
	);
};

const Wrapper = ( { selectedDate, children } ) => {
	const siteId = useSelector( getSelectedSiteId );
	const needCredentials = useSelector( ( state ) => getDoesRewindNeedCredentials( state, siteId ) );

	const siteSlug = useSelector( getSelectedSiteSlug );
	const onSelectDate = ( date ) =>
		page( backupMainPath( siteSlug, { date: date.format( INDEX_FORMAT ) } ) );

	return (
		<>
			<QueryRewindState siteId={ siteId } />

			<div className="backup__last-backup-status">
				{ needCredentials && <EnableRestoresBanner /> }

				<DatePicker onSelectDate={ onSelectDate } selectedDate={ selectedDate } />
				{ children }
			</div>
		</>
	);
};

export default BackupStatus;
