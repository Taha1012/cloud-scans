var async = require('async');
var helpers = require('../../../helpers/oracle/');

module.exports = {
    title: 'Boot Volume Backup Enabled',
    category: 'Compute',
    description: 'Ensures boot volumes have a backup policy.',
    more_info: 'Enabling a boot volume backup policy ensures that the boot volumes can be restored in the event of a compromised system or hardware failure.',
    recommended_action: 'Ensure all boot volumes have a backup policy.',
    link: 'https://docs.cloud.oracle.com/iaas/Content/Block/Concepts/bootvolumes.htm',
    apis: ['bootVolume:list','volumeBackupPolicyAssignment:bootVolume'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings.govcloud);

        async.each(regions.bootVolume, function(region, rcb){

            if (helpers.checkRegionSubscription(cache, source, results, region)) {

                var bootVolumes = helpers.addSource(cache, source,
                    ['bootVolume', 'list', region]);

                if (!bootVolumes) return rcb();

                if ((bootVolumes.err && bootVolumes.err.length) || !bootVolumes.data) {
                    helpers.addResult(results, 3,
                        'Unable to query for boot volume attachments: ' + helpers.addError(bootVolumes), region);
                    return rcb();
                }

                if (!bootVolumes.data.length) {
                    helpers.addResult(results, 0, 'No boot volumes found', region);
                    return rcb();
                }


                var badBootVolumes = [];
                bootVolumes.data.forEach(bootVolume => {
                    badBootVolumes.push(bootVolume.id);
                });

                var bootVolumeBackupPolicies = helpers.addSource(cache, source,
                    ['volumeBackupPolicyAssignment', 'bootVolume', region]);

                if (!bootVolumeBackupPolicies) return rcb();

                if ((bootVolumeBackupPolicies.err && bootVolumeBackupPolicies.err.length) || !bootVolumeBackupPolicies.data) {
                    helpers.addResult(results, 3,
                        'Unable to query for boot volume backups: ' + helpers.addError(bootVolumeBackupPolicies), region);
                    return rcb();
                }

                bootVolumeBackupPolicies.data.forEach(bootVolumeBackupPolicy => {
                    if (badBootVolumes.indexOf(bootVolumeBackupPolicy.bootVolumeId) > -1) {
                        badBootVolumes.splice(badBootVolumes.indexOf(bootVolumeBackupPolicy.bootVolumeId), 1);
                    }
                });

                if (badBootVolumes.length) {
                    var badBootVolumesStr = badBootVolumes.join(', ');
                    helpers.addResult(results, 2,
                        `The following boot volumes do not have a backup policy: ${badBootVolumesStr}`, region);
                } else {
                    helpers.addResult(results, 0,
                        'All boot volumes have a backup policy', region);
                }
            }
            rcb();
        }, function(){
            // Global checking goes here
            callback(null, results, source);
        });
    }
};