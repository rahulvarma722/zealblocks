/**
 * The editor half of the shared display conditions: how the attribute is
 * written, and when a block counts as having conditions.
 */

import {
	setCondition,
	hasConditions,
} from '../../src/shared/display-conditions/values';

describe( 'setCondition', () => {
	it( 'stores active conditions and drops inactive ones', () => {
		let next = setCondition( {}, 'hideWhenLoggedIn', true );
		next = setCondition( next, 'hideOnDays', [ 'monday' ] );

		expect( next ).toEqual( {
			hideWhenLoggedIn: true,
			hideOnDays: [ 'monday' ],
		} );

		next = setCondition( next, 'hideWhenLoggedIn', false );
		next = setCondition( next, 'hideOnDays', [] );
		next = setCondition( next, 'hideForRole', '' );

		expect( next ).toEqual( {} );
	} );

	it( 'does not mutate the attribute it was given', () => {
		const conditions = { hideWhenLoggedIn: true };

		setCondition( conditions, 'hideWhenLoggedIn', undefined );

		expect( conditions ).toEqual( { hideWhenLoggedIn: true } );
	} );
} );

describe( 'hasConditions', () => {
	it( 'is false for a missing or empty attribute', () => {
		expect( hasConditions( undefined ) ).toBe( false );
		expect( hasConditions( null ) ).toBe( false );
		expect( hasConditions( {} ) ).toBe( false );
	} );

	it( 'is true once any condition is stored', () => {
		expect( hasConditions( { hideForOS: 'ios' } ) ).toBe( true );
	} );
} );
