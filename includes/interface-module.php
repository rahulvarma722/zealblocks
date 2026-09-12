<?php
/**
 * The contract every feature module implements.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * A self-contained feature that registers its own hooks.
 *
 * WHY AN INTERFACE RATHER THAN A CONVENTION.
 *
 * `Plugin` instantiates whatever is in its module list and calls `register()`.
 * Without a contract that is a leap of faith — a typo'd method name fails at
 * runtime, on a hook, possibly only on the front end. With one, PHP refuses to
 * load a module that does not implement it, and the failure is at the point of
 * the mistake.
 *
 * WHY INSTANCES RATHER THAN STATIC init().
 *
 * The static form was fine while there were two blocks and nothing had
 * dependencies. It stops being fine as soon as a module needs collaborators or
 * a test needs to substitute one: a static method cannot be given a fake, and
 * static state does not reset between test cases. Constructor injection costs
 * one `new` per module and buys both.
 */
interface Module {

	/**
	 * Adds the module's hooks.
	 *
	 * Called once, on plugin load, in the order modules are listed. Must not
	 * do work directly — a module that queries or renders here runs on every
	 * request including admin-ajax and cron. Hook, and let WordPress decide.
	 *
	 * @return void
	 */
	public function register();
}
