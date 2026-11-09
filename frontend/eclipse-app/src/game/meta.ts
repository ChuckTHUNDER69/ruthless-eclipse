import { stateMeta } from 'state-shared';

// Ruthless Eclipse game meta: bet modes + rules/paytable content.
// Mode keys and costs MUST match math_v2/index.json exactly:
// base 1, surge 75, fracture 100, echo 150, eclipse 300.

const DISCLAIMER =
	'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.';

const emptyAssets = { icon: '', volatility: '', button: '', dialogImage: '', dialogVolatility: '' };
// Buy cards / confirm dialogs show the feature's painted medallion
// (circular-alpha webp renders of the production art).
const modeAssets = (name: string) => ({
	icon: `assets/medallions/${name}.webp`,
	volatility: '',
	button: '',
	dialogImage: `assets/medallions/${name}.webp`,
	dialogVolatility: '',
});

stateMeta.betModeMeta = {
	base: {
		mode: 'base',
		costMultiplier: 1.0,
		type: 'default',
		parent: '',
		children: '',
		assets: emptyAssets,
		text: {
			title: 'BASE GAME',
			dialog: '',
			button: '',
			betAmountLabel: 'BASE GAME',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'GOOD LUCK',
			bannerText: '',
		},
		maxWin: 20000,
	},
	surge: {
		mode: 'surge',
		costMultiplier: 75,
		type: 'buy',
		parent: '',
		children: '',
		assets: modeAssets('surge'),
		text: {
			title: 'SURGE',
			dialog:
				'Buy straight into SURGE free spins for 75x the bet amount. 10 FREE SPINS where every wild-bearing reel expands to four wilds.',
			description: '10 free spins · wild reels expand to four wilds.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'BONUS ACTIVATED',
			bannerText: '',
		},
		maxWin: 20000,
	},
	fracture: {
		mode: 'fracture',
		costMultiplier: 100,
		type: 'buy',
		parent: '',
		children: '',
		assets: modeAssets('fracture'),
		text: {
			title: 'FRACTURE',
			dialog:
				'Buy straight into FRACTURE free spins for 100x the bet amount. 10 FREE SPINS where every wild counts as two positions, multiplying the ways.',
			description: '10 free spins · every wild counts twice.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'BONUS ACTIVATED',
			bannerText: '',
		},
		maxWin: 20000,
	},
	echo: {
		mode: 'echo',
		costMultiplier: 150,
		type: 'buy',
		parent: '',
		children: '',
		assets: modeAssets('echo'),
		text: {
			title: 'ECHO',
			dialog:
				'Buy straight into ECHO free spins for 150x the bet amount. 8 FREE SPINS where wild positions copy onto the reel to the right (to the left from reel 6).',
			description: '8 free spins · wilds copy to a nearby reel.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'BONUS ACTIVATED',
			bannerText: '',
		},
		maxWin: 20000,
	},
	eclipse: {
		mode: 'eclipse',
		costMultiplier: 300,
		type: 'buy',
		parent: '',
		children: '',
		assets: modeAssets('eclipse'),
		text: {
			title: 'ECLIPSE',
			dialog:
				'Buy straight into ECLIPSE free spins for 300x the bet amount. 6 FREE SPINS with all three core reactions combined: Surge, then Echo, then Fracture.',
			description: '6 free spins · SURGE → ECHO → FRACTURE.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'BONUS ACTIVATED',
			bannerText: '',
		},
		maxWin: 20000,
	},
};

// Paytable display: money amounts per way at the bet, refreshed by
// EclipseControls to the player's current bet whenever PAYS opens.
// Defaults below are for a $1.00 bet (paytable x from config.ts).
const payRows: Array<[string, string, string]> = [
	['crown', 'CROWN', '3 $0.15 · 4 $0.45 · 5 $1.20 · 6 $2.50'],
	['phoenix', 'PHOENIX', '3 $0.12 · 4 $0.35 · 5 $0.85 · 6 $1.75'],
	['chalice', 'CHALICE', '3 $0.10 · 4 $0.25 · 5 $0.65 · 6 $1.25'],
	['moon', 'MOON', '3 $0.08 · 4 $0.20 · 5 $0.45 · 6 $1.00'],
	['comet', 'COMET', '3 $0.06 · 4 $0.15 · 5 $0.35 · 6 $0.70'],
	['rune', 'RUNE', '3 $0.05 · 4 $0.12 · 5 $0.25 · 6 $0.50'],
	['wild', 'WILD', 'Substitutes for every paying symbol. Never appears on reel 1.'],
];

stateMeta.gameRuleMeta = {
	payTable: [
		{
			title: 'PAYTABLE',
			rows: 8,
			columns: 1,
			containers: [
				{
					title: 'WAYS WINS',
					text: 'Amounts are per way for a $1.00 bet, for 3 · 4 · 5 · 6 of a kind on consecutive reels from the left. The matching counts on each reel multiply into the number of ways.',
					image: '',
					imagePosition: 'top',
					row: 0,
					column: 0,
				},
				...payRows.map(([key, name, values], i) => ({
					title: name,
					text: values,
					image: `assets/rules/${key}.webp`,
					imagePosition: 'left' as const,
					row: i + 1,
					column: 0,
				})),
			],
		},
	],
	gameRules: [
		{
			title: 'HOW TO PLAY',
			rows: 9,
			columns: 1,
			containers: [
				{
					title: 'THE GRID',
					text: 'Ruthless Eclipse plays on 6 reels with 4 rows — 4,096 ways on the base board. Fracture can grow reels taller, and the ways grow with them.',
					image: '',
					imagePosition: 'top',
					row: 0,
					column: 0,
				},
				{
					title: 'WAYS WINS',
					text: 'A symbol on 3 or more consecutive reels, starting from the left, forms a win. Only the longest consecutive run pays for each symbol, and the matching counts on the winning reels multiply into the number of ways. WILD substitutes for every paying symbol and never appears on reel 1.',
					image: 'assets/rules/wild.webp',
					imagePosition: 'left',
					row: 1,
					column: 0,
				},
				{
					title: 'ECLIPSE CORES',
					text: 'Every reel carries an Eclipse Core that can light on any base-game spin. The number of lit cores decides what happens: 1, 2 or 3 cores trigger a core reaction on that spin; 4 or more award free spins.',
					image: '',
					imagePosition: 'top',
					row: 2,
					column: 0,
				},
				{
					title: 'SURGE — 1 CORE',
					text: 'Every wild-bearing reel expands to four wilds.',
					image: 'assets/rules/surge.webp',
					imagePosition: 'left',
					row: 3,
					column: 0,
				},
				{
					title: 'FRACTURE — 2 CORES',
					text: 'Every wild counts as two positions, multiplying the ways.',
					image: 'assets/rules/fracture.webp',
					imagePosition: 'left',
					row: 4,
					column: 0,
				},
				{
					title: 'ECHO — 3 CORES',
					text: 'Wild positions copy onto the reel to the right — from reel 6 they copy to the left. Echo uses a snapshot of the original wild reels and can never spread onto reel 1.',
					image: 'assets/rules/echo.webp',
					imagePosition: 'left',
					row: 5,
					column: 0,
				},
				{
					title: 'FREE SPINS',
					text: '4 cores award 10 Surge free spins, 5 cores award 8 Echo free spins, and 6 cores award 6 Eclipse free spins, where Surge, Echo and Fracture combine. The board is paid unmodified first. During free spins the feature modifier is always active, cores are decorative, and free spins cannot be retriggered.',
					image: 'assets/rules/eclipse.webp',
					imagePosition: 'left',
					row: 6,
					column: 0,
				},
				{
					title: 'FEATURE BUYS & MAX WIN',
					text: 'SURGE buys 10 free spins for 75x the bet, FRACTURE 10 free spins for 100x, ECHO 8 free spins for 150x, and ECLIPSE 6 free spins for 300x. The total round win is capped at 20,000x the base bet.',
					image: '',
					imagePosition: 'top',
					row: 7,
					column: 0,
				},
				{
					title: 'CONTROLS',
					text: 'Press SPIN or the space bar to play. Use AUTO PLAY to play a set number of rounds automatically, confirming before it starts. Use the sound button to turn sounds on or off. Use the bet controls to change the bet amount, and ENTER THE FORGE to buy a feature.',
					image: '',
					imagePosition: 'top',
					row: 8,
					column: 0,
				},
				{
					title: 'LEGAL NOTICE',
					text: `The expected return to player is 96.3%. ${DISCLAIMER}`,
					image: '',
					imagePosition: 'top',
					row: 9,
					column: 0,
				},
			],
		},
	],
	splashScreen: [],
};
