/**
 * External dependencies
 */
import React from 'react';
import { useSelector } from 'react-redux';

/**
 * Internal dependencies
 */
import getSelectedSiteId from 'calypso/state/ui/selectors/get-selected-site-id';
import getDoesRewindNeedCredentials from 'calypso/state/selectors/get-does-rewind-need-credentials';
import getRewindCapabilities from 'calypso/state/selectors/get-rewind-capabilities';

const BackupStatusSimplified = () => {
	const siteId = useSelector( getSelectedSiteId );
	const hasRealtime = useSelector(
		( state ) => getRewindCapabilities( state, siteId )?.includes( 'backup-realtime' ) || false
	);
	const needsCredentials = useSelector( ( state ) =>
		getDoesRewindNeedCredentials( state, siteId )
	);

	return (
		<>
			{ needsCredentials && <EnableRestoresBanner /> }

			{ this.renderDatePicker() }

			<ul className="backup__card-list">
				<li key="daily-backup-status">
					<DailyBackupStatusAlternate
						{ ...{
							selectedDate: this.getSelectedDate(),
							lastBackupDate: lastDateAvailable,
							backup,
							isLatestBackup:
								latestBackup && backup && latestBackup.activityId === backup.activityId,
							dailyDeltas: getRawDailyBackupDeltas( logs, selectedDateString ),
						} }
					/>
				</li>

				{ hasRealtime && backup && (
					<>
						{ realtimeBackups.map( ( activity ) => (
							<li key={ activity.activityId }>
								<BackupCard activity={ activity } />
							</li>
						) ) }
					</>
				) }
			</ul>
		</>
	);
};

export default BackupStatusSimplified;
