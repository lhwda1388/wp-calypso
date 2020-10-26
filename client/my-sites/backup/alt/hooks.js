/**
 * External dependencies
 */
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

/**
 * Internal dependencies
 */
import { getActivitiesByType, getDailyBackupDeltas } from 'calypso/lib/jetpack/backup-utils';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import { getHttpData } from 'calypso/state/data-layer/http-data';
import { getRequestActivityLogsId, requestActivityLogs } from 'calypso/state/data-getters';

const BACKUP_ATTEMPT_ACTIVITIES = [
	'rewind__backup_complete_full',
	'rewind__backup_complete_initial',
	'rewind__backup_only_complete_full',
	'rewind__backup_only_complete_initial',
	'rewind__backup_error',
];

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

export const useActivityLogs = ( siteId, filter ) => {
	useEffect( () => {
		requestActivityLogs( siteId, filter );
	}, [ siteId, filter ] );
	const requestId = useMemo( () => getRequestActivityLogsId( siteId, filter ), [ siteId, filter ] );

	const response = useSelector( () => getHttpData( requestId ) );

	return {
		isLoadingActivityLogs: isLoading( response ),
		activityLogs: response.data || [],
	};
};

export const useBackupAttempts = ( siteId, { before, after, number = 1000 } = {} ) => {
	const filter = useMemo(
		() => ( {
			name: BACKUP_ATTEMPT_ACTIVITIES,
			before: before ? before.toISOString() : undefined,
			after: after ? after.toISOString() : undefined,
			aggregate: false,
			number,
		} ),
		[ before, after, number ]
	);

	const { activityLogs, isLoadingActivityLogs } = useActivityLogs( siteId, filter );
	return {
		isLoadingBackupAttempts: isLoadingActivityLogs,
		backupAttempts: activityLogs,
	};
};

const EMPTY_DELTAS = {
	mediaCreated: [],
	mediaDeleted: [],
	posts: [],
	postsCreated: [],
	postsDeleted: [],
	plugins: [],
	themes: [],
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

	const deltas =
		! isValidRequest || isLoading( response ) ? EMPTY_DELTAS : getActivitiesByType( response.data );

	return {
		isLoadingDeltas: isValidRequest && isLoading( response ),
		deltas,
	};
};
