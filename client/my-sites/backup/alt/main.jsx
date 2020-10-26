/**
 * External dependencies
 */
import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { useTranslate } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import { isEnabled } from 'calypso/config';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import { useApplySiteOffset } from 'calypso/components/site-offset';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import { INDEX_FORMAT } from 'calypso/lib/jetpack/backup-utils';
import canCurrentUser from 'calypso/state/selectors/can-current-user';
import getActivityLogFilter from 'calypso/state/selectors/get-activity-log-filter';
import getSelectedSiteId from 'calypso/state/ui/selectors/get-selected-site-id';
import BackupPlaceholder from 'calypso/components/jetpack/backup-placeholder';
import DocumentHead from 'calypso/components/data/document-head';
import EmptyContent from 'calypso/components/empty-content';
import FormattedHeader from 'calypso/components/formatted-header';
import Main from 'calypso/components/main';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import SidebarNavigation from 'calypso/components/sidebar-navigation';
import SearchResults from './search-results';
import BackupStatus from './backup-status';
import BackupStatusSimplified from './backup-status-simplified';

const isCurrentUserAdmin = ( state, siteId ) => canCurrentUser( state, siteId, 'manage_options' );

const isFilterEmpty = ( filter ) => {
	if ( ! filter ) {
		return true;
	}

	if ( filter.group || filter.on || filter.before || filter.after ) {
		return false;
	}

	if ( filter.page !== 1 ) {
		return false;
	}

	return true;
};

const BackupPage = ( { queryDate } ) => {
	const translate = useTranslate();

	const siteId = useSelector( getSelectedSiteId );
	const isAdmin = useSelector( ( state ) => isCurrentUserAdmin( state, siteId ) );

	const activityLogFilter = useSelector( ( state ) => getActivityLogFilter( state, siteId ) );
	const isFiltering = ! isFilterEmpty( activityLogFilter );

	const applySiteOffset = useApplySiteOffset();
	const moment = useLocalizedMoment();
	const selectedDate = applySiteOffset?.(
		queryDate ? moment( queryDate, INDEX_FORMAT ) : moment()
	);

	if ( ! selectedDate ) {
		return null;
	}

	return (
		<div
			className={ classNames( 'backup__page', {
				wordpressdotcom: ! isJetpackCloud(),
			} ) }
		>
			<Main
				className={ classNames( {
					is_jetpackcom: isJetpackCloud(),
				} ) }
			>
				<SidebarNavigation />
				{ ! isJetpackCloud() && (
					<FormattedHeader headerText="Jetpack Backup" align="left" brandFont />
				) }

				{ ! isAdmin && (
					<EmptyContent
						illustration="/calypso/images/illustrations/illustration-404.svg"
						title={ translate( 'You are not authorized to view this page' ) }
					/>
				) }

				{ isAdmin && isFiltering && <SearchResults /> }

				{ isAdmin && ! isFiltering && (
					<>
						<DocumentHead title={ translate( 'Latest backups' ) } />
						<PageViewTracker path="/backup/:site" title="Backups" />

						<div className="backup__main-wrap">
							{ isEnabled( 'jetpack/backup-simplified-screens-i4' ) ? (
								<BackupStatusSimplified />
							) : (
								<BackupStatus selectedDate={ selectedDate } />
							) }
						</div>
					</>
				) }
			</Main>
		</div>
	);
};

export default BackupPage;
