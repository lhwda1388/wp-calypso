/**
 * External dependencies
 */
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

/**
 * Internal dependencies
 */
import { useApplySiteOffset } from 'calypso/components/site-offset';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import {
	getDeltaActivities,
	getDeltaActivitiesByType,
	isActivityBackup,
	isSuccessfulRealtimeBackup,
} from 'calypso/lib/jetpack/backup-utils';
import { getHttpData } from 'calypso/state/data-layer/http-data';
import { getRequestActivityLogsId, requestActivityLogs } from 'calypso/state/data-getters';

const SUCCESSFUL_BACKUP_ACTIVITIES = [
	'rewind__backup_complete_full',
	'rewind__backup_complete_initial',
	'rewind__backup_only_complete_full',
	'rewind__backup_only_complete_initial',
];

const BACKUP_ATTEMPT_ACTIVITIES = [ ...SUCCESSFUL_BACKUP_ACTIVITIES, 'rewind__backup_error' ];

const DELTA_ACTIVITIES = [
	'attachment__uploaded',
	'attachment__deleted',
	'post__published',
	'post__trashed',
	'plugin__installed',
	'plugin__deleted',
	'theme__installed',
	'theme__deleted',
];

const isLoading = ( response ) => [ 'uninitialized', 'pending' ].includes( response.state );

const byActivityTsDescending = ( a, b ) => ( a.activityTs > b.activityTs ? -1 : 1 );

export const useActivityLogs = ( siteId, filter ) => {
	useEffect( () => {
		requestActivityLogs( siteId, filter );
	}, [ siteId, filter ] );
	const requestId = useMemo( () => getRequestActivityLogsId( siteId, filter ), [ siteId, filter ] );

	const response = useSelector( () => getHttpData( requestId ) );

	return {
		isLoadingActivityLogs: isLoading( response ),
		activityLogs: ( response.data || [] ).sort( byActivityTsDescending ),
	};
};

export const useLatestBackupAttempt = ( siteId, { before, after, successOnly = false } = {} ) => {
	const filter = {
		name: successOnly ? SUCCESSFUL_BACKUP_ACTIVITIES : BACKUP_ATTEMPT_ACTIVITIES,
		before: before ? before.toISOString() : undefined,
		after: after ? after.toISOString() : undefined,
		aggregate: false,
		number: 1,
	};

	const { activityLogs, isLoadingActivityLogs } = useActivityLogs( siteId, filter );
	return {
		isLoading: isLoadingActivityLogs,
		backupAttempt: activityLogs[ 0 ] || undefined,
	};
};

export const useBackupDeltas = ( siteId, { before, after, number = 1000 } = {} ) => {
	const filter = useMemo(
		() => ( {
			name: DELTA_ACTIVITIES,
			before: before ? before.toISOString() : undefined,
			after: after ? after.toISOString() : undefined,
			number,
		} ),
		[ before, after, number ]
	);

	const isValidRequest = filter.before && filter.after;

	useEffect( () => {
		isValidRequest && requestActivityLogs( siteId, filter );
	}, [ isValidRequest, siteId, filter ] );
	const requestId = useMemo( () => isValidRequest && getRequestActivityLogsId( siteId, filter ), [
		isValidRequest,
		siteId,
		filter,
	] );

	const response = useSelector( () => isValidRequest && getHttpData( requestId ) );

	if ( ! isValidRequest ) {
		return {
			isLoadingDeltas: false,
			deltas: getDeltaActivitiesByType( [] ),
		};
	}

	if ( isLoading( response ) ) {
		return {
			isLoadingDeltas: true,
			deltas: getDeltaActivitiesByType( [] ),
		};
	}

	return {
		isLoadingDeltas: false,
		deltas: getDeltaActivitiesByType( response.data ),
	};
};

export const useRawBackupDeltas = ( siteId, { before, after, number = 1000 } = {} ) => {
	const filter = useMemo(
		() => ( {
			name: DELTA_ACTIVITIES,
			before: before ? before.toISOString() : undefined,
			after: after ? after.toISOString() : undefined,
			number,
		} ),
		[ before, after, number ]
	);

	const isValidRequest = filter.before && filter.after;

	useEffect( () => {
		isValidRequest && requestActivityLogs( siteId, filter );
	}, [ isValidRequest, siteId, filter ] );
	const requestId = useMemo( () => isValidRequest && getRequestActivityLogsId( siteId, filter ), [
		isValidRequest,
		siteId,
		filter,
	] );

	const response = useSelector( () => isValidRequest && getHttpData( requestId ) );

	if ( ! isValidRequest ) {
		return {
			isLoadingDeltas: false,
			deltas: getDeltaActivities( [] ),
		};
	}

	if ( isLoading( response ) ) {
		return {
			isLoadingDeltas: true,
			deltas: getDeltaActivities( [] ),
		};
	}

	return {
		isLoadingDeltas: false,
		deltas: getDeltaActivities( response.data ).sort( byActivityTsDescending ),
	};
};

export const useDailyBackupStatus = ( siteId, selectedDate ) => {
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

	const backupDeltas = useBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				before: moment( lastAttemptOnDate.backupAttempt.activityTs ),
				after: moment( lastBackupBeforeDate.backupAttempt.activityTs ),
			}
	);

	const rawBackupDeltas = useRawBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				after: moment( lastBackupBeforeDate.backupAttempt.activityTs ),
				before: moment( lastAttemptOnDate.backupAttempt.activityTs ),
			}
	);

	return {
		isLoading:
			mostRecentBackupEver.isLoading ||
			lastBackupBeforeDate.isLoading ||
			lastAttemptOnDate.isLoading ||
			backupDeltas.isLoading ||
			rawBackupDeltas.isLoading,
		mostRecentBackupEver: mostRecentBackupEver.backupAttempt,
		lastBackupBeforeDate: lastBackupBeforeDate.backupAttempt,
		lastBackupAttemptOnDate: lastAttemptOnDate.backupAttempt,
		deltas: backupDeltas.deltas,
		rawDeltas: rawBackupDeltas.deltas,
	};
};

export const useRealtimeBackupStatus = ( siteId, selectedDate ) => {
	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();

	const mostRecentBackupEver = useLatestBackupAttempt( siteId, {
		successOnly: true,
	} );

	const lastBackupBeforeDate = useLatestBackupAttempt( siteId, {
		before: moment( selectedDate ).startOf( 'day' ),
		successOnly: true,
	} );

	const { activityLogs, isLoadingActivityLogs } = useActivityLogs( siteId, {
		before: moment( selectedDate ).endOf( 'day' ).toISOString(),
		after: moment( selectedDate ).startOf( 'day' ).toISOString(),
	} );

	const backupAttemptsOnDate = activityLogs.filter(
		( activity ) => isActivityBackup( activity ) || isSuccessfulRealtimeBackup( activity )
	);
	const lastBackupAttemptOnDate = backupAttemptsOnDate[ 0 ];

	const hasPreviousBackup = ! lastBackupBeforeDate.isLoading && lastBackupBeforeDate.backupAttempt;
	const successfulLastAttempt =
		lastBackupAttemptOnDate && isSuccessfulRealtimeBackup( lastBackupAttemptOnDate );
	const rawDeltas = useRawBackupDeltas(
		siteId,
		hasPreviousBackup &&
			successfulLastAttempt && {
				before: applySiteOffset( lastBackupAttemptOnDate.activityTs ),
				after: applySiteOffset( lastBackupBeforeDate.backupAttempt.activityTs ),
			}
	);

	return {
		isLoading:
			mostRecentBackupEver.isLoading ||
			lastBackupBeforeDate.isLoading ||
			isLoadingActivityLogs ||
			rawDeltas.isLoading,
		mostRecentBackupEver: mostRecentBackupEver.backupAttempt,
		lastBackupBeforeDate: lastBackupBeforeDate.backupAttempt,
		lastBackupAttemptOnDate: backupAttemptsOnDate[ 0 ],
		earlierBackupAttemptsOnDate: backupAttemptsOnDate?.slice?.( 1 ) || [],
		rawDeltas: rawDeltas.deltas,
	};
};
