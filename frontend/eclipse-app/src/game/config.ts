// Ruthless Eclipse — game config.
// Mode keys and costs MUST match math_v2/index.json exactly:
// base 1, surge 75, fracture 100, echo 150, eclipse 300.
// Paytable: x base bet PER WAY for 3/4/5/6 of a kind (ENGINE_SPEC.md).
// RTPs: exact math_v2 lookup values (VERIFICATION.md).
export default {
	providerName: 'eclipse',
	gameName: 'eclipse',
	gameID: '0_0_eclipse',
	rtp: 0.963,
	numReels: 6,
	numRows: [4, 4, 4, 4, 4, 4],
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.9626,
			max_win: 20000.0,
			description: 'default game entry type',
		},
		surge: {
			cost: 75.0,
			feature: false,
			buyBonus: true,
			rtp: 0.963,
			max_win: 20000.0,
			description: 'SURGE: 10 free spins, wild reels expand to four wilds',
		},
		fracture: {
			cost: 100.0,
			feature: false,
			buyBonus: true,
			rtp: 0.963,
			max_win: 20000.0,
			description: 'FRACTURE: 10 free spins, every wild counts as two positions',
		},
		echo: {
			cost: 150.0,
			feature: false,
			buyBonus: true,
			rtp: 0.963,
			max_win: 20000.0,
			description: 'ECHO: 8 free spins, wilds copy onto the neighbouring reel',
		},
		eclipse: {
			cost: 300.0,
			feature: false,
			buyBonus: true,
			rtp: 0.9633,
			max_win: 20000.0,
			description: 'ECLIPSE: 6 free spins with Surge, Echo and Fracture combined',
		},
	},
	symbols: {
		RUNE: {
			paytable: [{ '3': 0.05 }, { '4': 0.12 }, { '5': 0.25 }, { '6': 0.5 }],
		},
		COMET: {
			paytable: [{ '3': 0.06 }, { '4': 0.15 }, { '5': 0.35 }, { '6': 0.7 }],
		},
		MOON: {
			paytable: [{ '3': 0.08 }, { '4': 0.2 }, { '5': 0.45 }, { '6': 1.0 }],
		},
		CHALICE: {
			paytable: [{ '3': 0.1 }, { '4': 0.25 }, { '5': 0.65 }, { '6': 1.25 }],
		},
		PHOENIX: {
			paytable: [{ '3': 0.12 }, { '4': 0.35 }, { '5': 0.85 }, { '6': 1.75 }],
		},
		CROWN: {
			paytable: [{ '3': 0.15 }, { '4': 0.45 }, { '5': 1.2 }, { '6': 2.5 }],
		},
		WILD: {
			special_properties: ['wild'],
		},
	},
};
