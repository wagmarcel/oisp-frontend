'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
	    'Alerts',
	    'suppressed',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            }
        );
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn('Alerts', 'suppressed');
    }
};
