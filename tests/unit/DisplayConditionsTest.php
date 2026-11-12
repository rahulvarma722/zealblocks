<?php
/**
 * Unit tests for the display conditions decision.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Display_Conditions;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Display_Conditions
 */
final class DisplayConditionsTest extends TestCase {

	/**
	 * A logged-out Chrome-on-Windows visitor on a Monday.
	 *
	 * @param array $overrides Fields to change.
	 * @return array
	 */
	private function visitor( $overrides = array() ) {
		return array_merge(
			array(
				'logged_in' => false,
				'roles'     => array(),
				'browser'   => 'chrome',
				'os'        => 'windows',
				'day'       => 'monday',
			),
			$overrides
		);
	}

	/**
	 * No conditions, or junk, hides nothing.
	 *
	 * @return void
	 */
	public function test_nothing_set_hides_nothing() {
		$this->assertFalse( Display_Conditions::is_hidden( array(), $this->visitor() ) );
		$this->assertFalse( Display_Conditions::is_hidden( 'junk', $this->visitor() ) );
		$this->assertFalse( Display_Conditions::has_any( array( 'hideWhenLoggedIn' => false ) ) );
		$this->assertTrue( Display_Conditions::has_any( array( 'hideOnDays' => array( 'monday' ) ) ) );
	}

	/**
	 * Logged in / out toggles, and only a real `true` counts.
	 *
	 * @return void
	 */
	public function test_login_state() {
		$hide_in  = array( 'hideWhenLoggedIn' => true );
		$hide_out = array( 'hideWhenLoggedOut' => true );

		$this->assertTrue( Display_Conditions::is_hidden( $hide_in, $this->visitor( array( 'logged_in' => true ) ) ) );
		$this->assertFalse( Display_Conditions::is_hidden( $hide_in, $this->visitor() ) );
		$this->assertTrue( Display_Conditions::is_hidden( $hide_out, $this->visitor() ) );
		$this->assertFalse( Display_Conditions::is_hidden( array( 'hideWhenLoggedOut' => 'yes' ), $this->visitor() ), 'a string is not a toggle' );
	}

	/**
	 * Role only matches a logged-in user holding it.
	 *
	 * @return void
	 */
	public function test_role() {
		$conditions = array( 'hideForRole' => 'editor' );

		$this->assertTrue(
			Display_Conditions::is_hidden(
				$conditions,
				$this->visitor(
					array(
						'logged_in' => true,
						'roles'     => array( 'editor' ),
					)
				)
			)
		);
		$this->assertFalse( Display_Conditions::is_hidden( $conditions, $this->visitor( array( 'roles' => array( 'editor' ) ) ) ), 'needs a logged-in user' );
	}

	/**
	 * Browser, OS and day; conditions are ORed.
	 *
	 * @return void
	 */
	public function test_browser_os_day() {
		$this->assertTrue( Display_Conditions::is_hidden( array( 'hideForBrowser' => 'chrome' ), $this->visitor() ) );
		$this->assertFalse( Display_Conditions::is_hidden( array( 'hideForBrowser' => 'safari' ), $this->visitor() ) );
		$this->assertTrue( Display_Conditions::is_hidden( array( 'hideForOS' => 'windows' ), $this->visitor() ) );
		$this->assertTrue( Display_Conditions::is_hidden( array( 'hideOnDays' => array( 'sunday', 'monday' ) ), $this->visitor() ) );
		$this->assertFalse( Display_Conditions::is_hidden( array( 'hideOnDays' => array( 'sunday' ) ), $this->visitor() ) );
		$this->assertTrue(
			Display_Conditions::is_hidden(
				array(
					'hideForBrowser' => 'safari',
					'hideForOS'      => 'windows',
				),
				$this->visitor()
			),
			'any one matching condition hides'
		);
	}

	/**
	 * User agents that claim several browsers resolve to the real one.
	 *
	 * @return void
	 */
	public function test_browser_detection() {
		$chrome  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
		$edge    = $chrome . ' Edg/129.0';
		$opera   = $chrome . ' OPR/114.0';
		$safari  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
		$fx_ios  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15';
		$firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
		$android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

		$this->assertSame( 'chrome', Display_Conditions::browser( $chrome ) );
		$this->assertSame( 'edge', Display_Conditions::browser( $edge ) );
		$this->assertSame( 'opera', Display_Conditions::browser( $opera ) );
		$this->assertSame( 'safari', Display_Conditions::browser( $safari ) );
		$this->assertSame( 'firefox', Display_Conditions::browser( $fx_ios ) );
		$this->assertSame( '', Display_Conditions::browser( 'curl/8.0' ) );

		$this->assertSame( 'windows', Display_Conditions::os( $chrome ) );
		$this->assertSame( 'mac_os', Display_Conditions::os( $safari ) );
		$this->assertSame( 'ios', Display_Conditions::os( $fx_ios ), 'an iPhone says "like Mac OS X"' );
		$this->assertSame( 'android', Display_Conditions::os( $android ), 'Android says "Linux"' );
		$this->assertSame( 'linux', Display_Conditions::os( $firefox ) );
	}
}
