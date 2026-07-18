export interface Player {
	id: string;
	name: string;
}

export interface Group {
	[groupName: string]: Player[];
}

export interface Division {
	id: string;
	name: string;
	groups: Group;
}

export interface TournamentData {
	tournamentName: string;
	divisions: Record<string, Division>;
}

export const TOURNAMENT_DATA: TournamentData = {
	tournamentName: "Visagino All Inclusive 2026 Vienetų Turnyras",
	divisions: {
		power: {
			id: "power",
			name: "Power",
			groups: {
				A: [
					{ id: "pow_1", name: "Artem Staščiuk" },
					{ id: "pow_2", name: "Ivan Gorbun" },
					{ id: "pow_3", name: "Artur Margevičius" },
					{ id: "pow_4", name: "Ksenija Klimova" },
					{ id: "pow_5", name: "Vladimir Lukašenko" },
				],
			},
		},
		masters: {
			id: "masters",
			name: "Masters",
			groups: {
				A: [
					{ id: "mas_a1", name: "Ksenija Klimova" },
					{ id: "mas_a2", name: "Maksim Babachin" },
					{ id: "mas_a3", name: "Sergej Maliavskij" },
					{ id: "mas_a4", name: "Viačeslav Rumiancev" },
					{ id: "mas_a5", name: "Aleksej Osincev" },
				],
				B: [
					{ id: "mas_b1", name: "Sergej Obožin" },
					{ id: "mas_b2", name: "Sergej Presniakov" },
					{ id: "mas_b3", name: "Deimantas Bartaškas" },
					{ id: "mas_b4", name: "Pavel Blinov" },
					{ id: "mas_b5", name: "Eduard Dim" },
				],
			},
		},
		mastersLight: {
			id: "mastersLight",
			name: "Masters Light",
			groups: {
				A: [
					{ id: "msl_a1", name: "Vitalij Kiselev" },
					{ id: "msl_a2", name: "Artem Zarovkin" },
					{ id: "msl_a3", name: "Tomas Grudzinskas" },
					{ id: "msl_a4", name: "Igor Naguj" },
				],
				B: [
					{ id: "msl_b1", name: "Kazimieras" },
					{ id: "msl_b2", name: "Dmitrij Dudov" },
					{ id: "msl_b3", name: "Aleksandr Fiodorov" },
					{ id: "msl_b4", name: "Andrej Dydenko" },
				],
			},
		},
		mastersPrincess: {
			id: "mastersPrincess",
			name: "Masters Princess",
			groups: {
				A: [
					{ id: "mpr_a1", name: "Nina Staščiuk" },
					{ id: "mpr_a2", name: "Ana Tiuneva" },
					{ id: "mpr_a3", name: "Ana Kostenko" },
					{ id: "mpr_a4", name: "Anastasija Lykosova" },
					{ id: "mpr_a5", name: "Jelizaveta" },
				],
				B: [
					{ id: "mpr_b1", name: "Aliona Šugajeva" },
					{ id: "mpr_b2", name: "Darija Osipova" },
					{ id: "mpr_b3", name: "Ilona Čebatoriūnaitė" },
					{ id: "mpr_b4", name: "Ksenija Tomm" },
				],
			},
		},
	},
};

export function getAllDivisions(): Division[] {
	return Object.values(TOURNAMENT_DATA.divisions);
}

export function getDivision(id: string): Division | undefined {
	return TOURNAMENT_DATA.divisions[id];
}

export function makeMatchDocId(
	divisionId: string,
	groupName: string,
	player1Id: string,
	player2Id: string,
): string {
	const [a, b] = [player1Id, player2Id].sort();
	return `${divisionId}_${groupName}_${a}_vs_${b}`;
}
