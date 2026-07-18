export interface DoublesPlayer {
	id: string;
	name: string;
	gender?: "male" | "female";
}

export interface DoublesPair {
	id: string;
	player1Id: string;
	player2Id: string;
	drawOrder: number;
}

export interface PairingPhaseConfig {
	id: string;
	name: string;
	seededLabel: string;
	drawLabel: string;
	pairIdPrefix: string;
	seeded: string[];
	draw: string[];
}

export interface DoublesDivision {
	id: string;
	name: string;
	phases: PairingPhaseConfig[];
	groupMode: "single" | "mixAlternating";
}

export interface DoublesTournamentData {
	id: string;
	name: string;
	players: Record<string, DoublesPlayer>;
	divisions: Record<string, DoublesDivision>;
}

export interface DrawEvent {
	type: "pair_created" | "pair_assigned_to_group";
	order: number;
	phaseId?: string;
	pairId?: string;
	seededPlayerId?: string;
	drawnPlayerId?: string;
	groupName?: string;
	createdAt?: unknown;
}

export interface DrawState {
	status?: "draft" | "drawing" | "complete";
	pairs: DoublesPair[];
	groups?: Record<string, string[]>;
	events?: DrawEvent[];
}

export const DOUBLES_TOURNAMENT_DATA: DoublesTournamentData = {
	id: "doubles2026",
	name: "Visagino ALL INCLUSIVE 2026 dvejetų turnyras",
	players: {
		artem_stasciuk: {
			id: "artem_stasciuk",
			name: "Стащук Артем",
			gender: "male",
		},
		ivan_gorbun: { id: "ivan_gorbun", name: "Горбун Иван", gender: "male" },
		artur_margevicius: {
			id: "artur_margevicius",
			name: "Маргявичюс Артур",
			gender: "male",
		},
		ilja_petrov: { id: "ilja_petrov", name: "Ilja Petrov", gender: "male" },
		sergej_presnjakov: {
			id: "sergej_presnjakov",
			name: "Сергей Пресняков",
			gender: "male",
		},
		oleg_kolobov: { id: "oleg_kolobov", name: "Олег Колобов", gender: "male" },
		maksim_babachin: {
			id: "maksim_babachin",
			name: "Бабахин Максим",
			gender: "male",
		},
		ksenija_klimova: {
			id: "ksenija_klimova",
			name: "Ксения Климова (LV)",
			gender: "female",
		},
		sergej_logacev: {
			id: "sergej_logacev",
			name: "Логачев Сергей",
			gender: "male",
		},
		pavel_blinov: { id: "pavel_blinov", name: "Павел Блинов", gender: "male" },

		sergej_obozin: {
			id: "sergej_obozin",
			name: "Обожин Сергей",
			gender: "male",
		},
		vladimir_firsov: {
			id: "vladimir_firsov",
			name: "Владимир Фирсов",
			gender: "male",
		},
		aleksandr_fedotovskij: {
			id: "aleksandr_fedotovskij",
			name: "Федотовский Александр",
			gender: "male",
		},
		vasilij_ovchinnikov: {
			id: "vasilij_ovchinnikov",
			name: "Василий Овчинников",
			gender: "male",
		},
		eduard_dim: { id: "eduard_dim", name: "Эдуард Дим", gender: "male" },
		aleksej_osincev: {
			id: "aleksej_osincev",
			name: "Алексей Осинцев",
			gender: "male",
		},
		kazimiras: { id: "kazimiras", name: "Казимираc", gender: "male" },
		aleksandr_fedorov: {
			id: "aleksandr_fedorov",
			name: "Александр Федоров",
			gender: "male",
		},
		dmitrij_dudov: {
			id: "dmitrij_dudov",
			name: "Дмитрий Дудов",
			gender: "male",
		},
		erik_obuhovich: {
			id: "erik_obuhovich",
			name: "Эрик Обухович",
			gender: "male",
		},
		valerij_cvetkov: {
			id: "valerij_cvetkov",
			name: "Валерий Цветков",
			gender: "male",
		},
		andrej_didenko: {
			id: "andrej_didenko",
			name: "Андрей Диденко",
			gender: "male",
		},

		alena_shugaeva: {
			id: "alena_shugaeva",
			name: "Алена Шугаева",
			gender: "female",
		},
		ilona_cebatoriunaite: {
			id: "ilona_cebatoriunaite",
			name: "Илона Чебаторюнайте",
			gender: "female",
		},
		anastasija_lykosova: {
			id: "anastasija_lykosova",
			name: "Анастасия Лыкосова",
			gender: "female",
		},
		justina_jakaite: {
			id: "justina_jakaite",
			name: "Юстина Якайте",
			gender: "female",
		},
		vika_volkova: {
			id: "vika_volkova",
			name: "Вика Волкова",
			gender: "female",
		},
		nina_stasciuk: {
			id: "nina_stasciuk",
			name: "Нина Стащук",
			gender: "female",
		},
		anna_tiuneva: { id: "anna_tiuneva", name: "Анна Тюнева", gender: "female" },
		darja_osipova: {
			id: "darja_osipova",
			name: "Дарья Осипова",
			gender: "female",
		},
		jelizaveta_novikova: {
			id: "jelizaveta_novikova",
			name: "Елизавета Новикова",
			gender: "female",
		},
		ksenija_tomm: { id: "ksenija_tomm", name: "Ксения Томм", gender: "female" },
		oskar_margevicius: {
			id: "oskar_margevicius",
			name: "Оскар Маргявичюс",
			gender: "male",
		},
		vasilij_bolja: {
			id: "vasilij_bolja",
			name: "Василий Боля",
			gender: "male",
		},
	},
	divisions: {
		power: {
			id: "power",
			name: "Power",
			groupMode: "single",
			phases: [
				{
					id: "main",
					name: "Power · Burtai",
					seededLabel: "Reitinguoti 1–5",
					drawLabel: "Reitinguoti 6–10",
					pairIdPrefix: "power_pair",
					seeded: [
						"artem_stasciuk",
						"ivan_gorbun",
						"artur_margevicius",
						"ilja_petrov",
						"sergej_presnjakov",
					],
					draw: [
						"oleg_kolobov",
						"maksim_babachin",
						"ksenija_klimova",
						"sergej_logacev",
						"pavel_blinov",
					],
				},
			],
		},
		masters: {
			id: "masters",
			name: "Masters",
			groupMode: "single",
			phases: [
				{
					id: "main",
					name: "Masters · Burtai",
					seededLabel: "Reitinguoti 1–6",
					drawLabel: "Reitinguoti 7–12",
					pairIdPrefix: "masters_pair",
					seeded: [
						"sergej_obozin",
						"vladimir_firsov",
						"aleksandr_fedotovskij",
						"vasilij_ovchinnikov",
						"eduard_dim",
						"aleksej_osincev",
					],
					draw: [
						"kazimiras",
						"aleksandr_fedorov",
						"dmitrij_dudov",
						"erik_obuhovich",
						"valerij_cvetkov",
						"andrej_didenko",
					],
				},
			],
		},
		mix: {
			id: "mix",
			name: "Masters Mix",
			groupMode: "mixAlternating",
			phases: [
				{
					id: "women_seeded",
					name: "Mix · 1 etapas",
					seededLabel: "Reitinguotos moterys 1–5",
					drawLabel: "Vyrai 6–10",
					pairIdPrefix: "mix_pair",
					seeded: [
						"alena_shugaeva",
						"ilona_cebatoriunaite",
						"anastasija_lykosova",
						"justina_jakaite",
						"vika_volkova",
					],
					draw: [
						"erik_obuhovich",
						"valerij_cvetkov",
						"andrej_didenko",
						"oskar_margevicius",
						"vasilij_bolja",
					],
				},
				{
					id: "men_seeded",
					name: "Mix · 2 etapas",
					seededLabel: "Reitinguoti vyrai 1–5",
					drawLabel: "Moterys 6–10",
					pairIdPrefix: "mix_pair",
					seeded: [
						"sergej_obozin",
						"aleksandr_fedotovskij",
						"eduard_dim",
						"aleksandr_fedorov",
						"dmitrij_dudov",
					],
					draw: [
						"nina_stasciuk",
						"anna_tiuneva",
						"darja_osipova",
						"jelizaveta_novikova",
						"ksenija_tomm",
					],
				},
			],
		},
	},
};

export function getDoublesDivisions(): DoublesDivision[] {
	return Object.values(DOUBLES_TOURNAMENT_DATA.divisions);
}

export function getDoublesPlayerName(playerId: string): string {
	return DOUBLES_TOURNAMENT_DATA.players[playerId]?.name ?? playerId;
}

export function getPairName(pair: DoublesPair): string {
	return `${getDoublesPlayerName(pair.player1Id)} / ${getDoublesPlayerName(pair.player2Id)}`;
}

export function getAllConfiguredPlayers(division: DoublesDivision): string[] {
	return division.phases.flatMap((phase) => [...phase.seeded, ...phase.draw]);
}

export function makeDoublesMatchDocId(
	divisionId: string,
	groupName: string,
	pair1Id: string,
	pair2Id: string,
): string {
	const [a, b] = [pair1Id, pair2Id].sort();
	return `${divisionId}_${groupName}_${a}_vs_${b}`;
}

export function buildGroupsFromDraw(
	division: DoublesDivision,
	drawState: DrawState,
): Record<string, DoublesPair[]> {
	const pairsById = new Map(drawState.pairs.map((pair) => [pair.id, pair]));

	if (drawState.groups) {
		return Object.fromEntries(
			Object.entries(drawState.groups).map(([groupName, pairIds]) => [
				groupName,
				pairIds
					.map((pairId) => pairsById.get(pairId))
					.filter((pair): pair is DoublesPair => !!pair),
			]),
		);
	}

	if (division.groupMode === "single" && drawState.pairs.length > 0) {
		return {
			A: [...drawState.pairs].sort((a, b) => a.drawOrder - b.drawOrder),
		};
	}

	return {};
}

export function getExpectedPairCount(division: DoublesDivision): number {
	return division.phases.reduce((sum, phase) => sum + phase.seeded.length, 0);
}
