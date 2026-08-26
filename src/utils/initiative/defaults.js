// Default values for the Initiative Tracker's persisted state.
//
// Extracted verbatim from 1mainCode.jsx so the storage layer can hydrate a
// tracker document without duplicating them. Behaviour is unchanged — these are
// the same defaults the component used inline before.

export const INITIATIVE_ROW_COUNT = 20;

export const createDefaultRowData = () =>
	Array(INITIATIVE_ROW_COUNT).fill({ name: '', affiliation: '', initiative: null, conditions: [], summons: [], summonConditions: {} });

export const createDefaultRowVisibility = () =>
	Array(INITIATIVE_ROW_COUNT).fill(false).map((_, index) => index === 0);

export const createDefaultOverlayActive = () =>
	Array(INITIATIVE_ROW_COUNT).fill(false).map((_, index) => index === 0);

export const DEFAULT_CONDITION_COLORS = {
  Blinded: 'var(--bad-condition-background)',
  Charmed: 'var(--bad-condition-background)',
  Deafened: 'var(--bad-condition-background)',
  Frightened: 'var(--bad-condition-background)',
  Grappled: 'var(--bad-condition-background)',
  Incapacitated: 'var(--bad-condition-background)',
  Invisible: 'var(--good-condition-background)',
  Paralyzed: 'var(--bad-condition-background)',
  Petrified: 'var(--bad-condition-background)',
  Poisoned: 'var(--bad-condition-background)',
  Prone: 'var(--neutral-condition-background)',
  Restrained: 'var(--bad-condition-background)',
  Stunned: 'var(--bad-condition-background)',
  Unconscious: 'var(--bad-condition-background)',
  'Exhaustion1': 'var(--bad-condition-background)',
  'Exhaustion2': 'var(--bad-condition-background)',
  'Exhaustion3': 'var(--bad-condition-background)',
  'Exhaustion4': 'var(--bad-condition-background)',
  'Exhaustion5': 'var(--bad-condition-background)',
  'Exhaustion6': 'var(--bad-condition-background)',
  Other1: 'var(--neutral-condition-background)',
  Other2: 'var(--neutral-condition-background)',
  Other3: 'var(--neutral-condition-background)',
  Other4: 'var(--neutral-condition-background)',
  '(Custom)': 'var(--neutral-condition-background)',
};

export const DEFAULT_CONDITION_DESCRIPTIONS = {
  Blinded: "• Can't See. You can't see and automatically fail any ability check that requires sight.???• Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.",
  Charmed: "• Can't Harm the Charmer. You can't attack the charmer or target the charmer with damaging abilities or magical effects.???• Social Advantage. The charmer has Advantage on any ability check to interact with you socially.",
  Deafened: "• Can't Hear. You can't hear and automatically fail any ability check that requires hearing.",
  Frightened: "• Ability Checks and Attacks Affected. You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.???• Can't Approach. You can't willingly move closer to the source of fear.",
  Grappled: "• Speed 0. Your Speed is 0 and can't increase.???• Attacks Affected. You have Disadvantage on attack rolls against any target other than the grappler.???• Movable. The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.",
  Incapacitated: "• Inactive. You can't take any action, Bonus Action, or Reaction.???• No Concentration. Your Concentration is broken.???• Speechless. You can't speak.???• Surprised. If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
  Invisible: "• Surprise. If you're Invisible when you roll Initiative, you have Advantage on the roll.???• Concealed. You aren't affected by any effect that requires its target to be seen unless the effect's creator can somehow see you. Any equipment you are wearing or carrying is also concealed.???• Attacks Affected. Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you don't gain this benefit against that creature.",
  Paralyzed: "• Incapacitated. You have the Incapacitated condition.???• Speed 0. Your Speed is 0 and can't increase.???• Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???• Attacks Affected. Attack rolls against you have Advantage.???• Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.",
  Petrified: "• Turned to Inanimate Substance. You are transformed, along with any nonmagical objects you are wearing and carrying, into a solid inanimate substance (usually stone). Your weight increases by a factor of ten, and you cease aging.???• Incapacitated. You have the Incapacitated condition.???• Speed 0. Your Speed is 0 and can't increase.???• Attacks Affected. Attack rolls against you have Advantage.???• Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???• Resist Damage. You have Resistance to all damage.???• Poison Immunity. You have Immunity to the Poisoned condition.",
  Poisoned: "• Ability Checks and Attacks Affected. You have Disadvantage on attack rolls and ability checks.",
  Prone: "• Restricted Movement. Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you can't right yourself.???• Attacks Affected. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.",
  Restrained: "• Speed 0. Your Speed is 0 and can't increase.???• Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.???• Saving Throws Affected. You have Disadvantage on Dexterity saving throws.",
  Stunned: "• Incapacitated. You have the Incapacitated condition.???• Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???• Attacks Affected. Attack rolls against you have Advantage.",
  Unconscious: "• Inert. You have the Incapacitated and Prone conditions, and you drop whatever you're holding. When this condition ends, you remain Prone.???• Speed 0. Your Speed is 0 and can't increase.???• Attacks Affected. Attack rolls against you have Advantage.???• Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???• Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.???• Unaware. You're unaware of your surroundings.",
  Exhaustion1: "• D20 Tests Affected. When you make a D20 Test, the roll is reduced by 2.???• Speed Reduced. Your Speed is reduced by 5 feet.???• Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
  Exhaustion2: "• D20 Tests Affected. When you make a D20 Test, the roll is reduced by 4.???• Speed Reduced. Your Speed is reduced by 10 feet.???• Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
  Exhaustion3: "• D20 Tests Affected. When you make a D20 Test, the roll is reduced by 6.???• Speed Reduced. Your Speed is reduced by 15 feet.???• Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
  Exhaustion4: "• D20 Tests Affected. When you make a D20 Test, the roll is reduced by 8.???• Speed Reduced. Your Speed is reduced by 20 feet.???• Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
  Exhaustion5: "• D20 Tests Affected. When you make a D20 Test, the roll is reduced by 10.???• Speed Reduced. Your Speed is reduced by 25 feet.???• Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
  Exhaustion6: "• You are Dead.???• If you are revived after dying this way, you return to life with Exhaustion5.",
  "(Custom)": "Filler description for custom condition.",
};

// A brand-new, empty tracker document body.
export function createDefaultTrackerData() {
	return {
		rowData: createDefaultRowData(),
		round: 1,
		rowVisibility: createDefaultRowVisibility(),
		overlayActive: createDefaultOverlayActive(),
		shiftedRowIndex: null,
		customConditions: [],
		conditionColors: { ...DEFAULT_CONDITION_COLORS },
		conditionDescriptions: { ...DEFAULT_CONDITION_DESCRIPTIONS },
		showArmorClass: true,
		showHitPoints: true,
	};
}
