/**
 * External dependencies
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import page from 'page';

/**
 * Internal dependencies
 */
import { useApplySiteOffset } from 'calypso/components/site-offset';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import {
	getDailyBackupDeltas,
	isSuccessfulDailyBackup,
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
import { useBackupAttempts, useBackupDeltas } from './hooks';

const BackupStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );
	const hasRealtime = useSelector(
		( state ) => getRewindCapabilities( state, siteId )?.includes?.( 'backup-realtime' ) || false
	);

	return (
		<Wrapper selectedDate={ selectedDate }>
			<QueryRewindCapabilities siteId={ siteId } />
			<DailyStatus selectedDate={ selectedDate } />
			{ /* { hasRealtime ? (
				<RealtimeStatus selectedDate={ selectedDate } />
			) : (
				<DailyStatus selectedDate={ selectedDate } />
			) } */ }
		</Wrapper>
	);
};

const DailyStatus = ( { selectedDate } ) => {
	const siteId = useSelector( getSelectedSiteId );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const byMomentDescending = ( a, b ) =>
		a.activityLocalMoment.isAfter( b.activityLocalMoment ) ? -1 : 1;

	const { backupAttempts, isLoadingBackupAttempts } = useBackupAttempts( siteId, {
		before: moment( selectedDate ).endOf( 'day' ),
	} );

	backupAttempts.forEach(
		( attempt ) => ( attempt.activityLocalMoment = applySiteOffset( attempt.activityTs ) )
	);
	backupAttempts.sort( byMomentDescending );

	const lastAttemptOnDate = backupAttempts.filter( ( backup ) =>
		backup.activityLocalMoment.isSame( selectedDate, 'day' )
	)[ 0 ];
	const lastSuccessfulPastAttempt = backupAttempts
		.filter( isSuccessfulDailyBackup )
		.filter(
			( backup ) => backup.activityLocalMoment < moment( selectedDate ).startOf( 'day' )
		)[ 0 ];

	const { deltas, isLoadingDeltas } = useBackupDeltas( siteId, {
		before: lastAttemptOnDate?.activityLocalMoment,
		after: lastSuccessfulPastAttempt?.activityLocalMoment,
	} );

	if ( isLoadingBackupAttempts || isLoadingDeltas ) {
		return <div className="backup-placeholder__daily-backup-status" />;
	}

	return (
		<MostRecentStatus
			{ ...{
				selectedDate,
				lastBackupDate: lastSuccessfulPastAttempt?.activityLocalMoment,
				backup: lastAttemptOnDate,
				deltas,
			} }
		/>
	);
};

// const RealtimeStatus = ( { selectedDate } ) => {
// 	const siteSlug = useSelector( getSelectedSiteSlug );
// 	const canRestore = useSelector( ( state ) => {
// 		const rewindState = getRewindState( state, siteId );
// 		return (
// 			rewindState?.state === 'active' &&
// 			! [ 'queued', 'running' ].includes( rewindState?.rewind?.status )
// 		);
// 	} );

// 	return (
// 		<>
// 			<MostRecentStatus
// 				{ ...{
// 					selectedDate,
// 					lastBackupDate: lastDateAvailable,
// 					backup: mostRecentBackupForDate,
// 					deltas,
// 				} }
// 			/>

// 			{ lastBackup && (
// 				<BackupDelta
// 					{ ...{
// 						deltas,
// 						realtimeBackups,
// 						needCredentials,
// 						allowRestore: canRestore,
// 						moment,
// 						siteSlug,
// 						isToday: today.isSame( selectedDate, 'day' ),
// 					} }
// 				/>
// 			) }
// 		</>
// 	);
// };

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
