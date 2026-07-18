import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupTable } from "@/components/GroupTable";
import { FinalStage } from "@/components/FinalStage";
import { DoublesTournament } from "@/components/DoublesTournament";
import { TOURNAMENT_DATA, getAllDivisions } from "@/data/tournament";
import { useMatches } from "@/hooks/useMatches";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

type TournamentView = "singles" | "doubles";

function getInitialTournamentView(): TournamentView {
	const params = new URLSearchParams(window.location.search);
	return params.get("tournament") === "doubles" ? "doubles" : "singles";
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center py-24">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
		</div>
	);
}

function App() {
	const divisions = useMemo(() => getAllDivisions(), []);
	const { theme, toggleTheme } = useTheme();
	const [tournamentView, setTournamentView] = useState<TournamentView>(
		getInitialTournamentView,
	);

	const [isAdmin] = useState(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get("mode") === "admin";
	});

	const [activeDivision, setActiveDivision] = useState(divisions[0]?.id || "");

	const division = TOURNAMENT_DATA.divisions[activeDivision];
	const { matches, loading } = useMatches(activeDivision);

	if (!division) return null;

	const groupNames = Object.keys(division.groups);
	const isDoubles = tournamentView === "doubles";
	const title = isDoubles
		? "Visagino ALL INCLUSIVE 2026 dvejetų turnyras"
		: TOURNAMENT_DATA.tournamentName;
	const activeDivisionName = isDoubles ? "Dvejetai" : division.name;

	const changeTournamentView = (view: TournamentView) => {
		setTournamentView(view);
		const url = new URL(window.location.href);
		if (view === "doubles") url.searchParams.set("tournament", "doubles");
		else url.searchParams.delete("tournament");
		window.history.replaceState(null, "", url.toString());
	};

	return (
		<div className="min-h-screen bg-[var(--color-background)] font-sans text-[var(--color-foreground)]">
			<header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
				<div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold tracking-[-0.02em]">
							Visagino All Inclusive 2026
						</p>
						<p className="text-xs text-[var(--color-muted-foreground)]">
							{isDoubles ? "Dvejetai" : "Vienetai"} · Grupių etapas
						</p>
					</div>
					<div className="flex items-center gap-2">
						{isAdmin && (
							<span className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs font-semibold text-[var(--color-foreground)] shadow-sm">
								Admin
							</span>
						)}
						<div className="inline-flex w-fit rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-1 shadow-sm">
							<button
								type="button"
								onClick={() => changeTournamentView("singles")}
								className={`rounded-lg px-4 py-2 text-sm! font-semibold! tracking-[-0.01em] transition-all duration-200 ${
									!isDoubles
										? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
										: "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
								}`}
							>
								Vienetai
							</button>
							<button
								type="button"
								onClick={() => changeTournamentView("doubles")}
								className={`rounded-lg px-4 py-2 text-sm! font-semibold! tracking-[-0.01em] transition-all duration-200 ${
									isDoubles
										? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
										: "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
								}`}
							>
								Dvejetai
							</button>
						</div>

						<button
							type="button"
							onClick={toggleTheme}
							className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-sm transition-all duration-200 hover:border-[var(--color-ring)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
							aria-label="Perjungti temą"
						>
							{theme === "dark" ? (
								<Sun className="h-4 w-4" />
							) : (
								<Moon className="h-4 w-4" />
							)}
						</button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
				{isDoubles ? (
					<DoublesTournament isAdmin={isAdmin} />
				) : (
					<>
						<Tabs
							value={activeDivision}
							onValueChange={setActiveDivision}
							className="mb-6"
						>
							<TabsList className="h-auto flex-wrap justify-start">
								{divisions.map((div) => (
									<TabsTrigger key={div.id} value={div.id}>
										{div.name}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>

						{loading && <LoadingState />}

						{!loading && (
							<>
								<FinalStage
									division={division}
									matches={matches}
									isAdmin={isAdmin}
								/>

								<div
									className={`grid gap-6 ${
										groupNames.length > 1
											? "grid-cols-1 xl:grid-cols-2"
											: "grid-cols-1"
									}`}
								>
									{groupNames.map((groupName) => (
										<GroupTable
											key={groupName}
											divisionId={division.id}
											groupName={groupName}
											players={division.groups[groupName]}
											matches={matches}
											isAdmin={isAdmin}
										/>
									))}
								</div>
							</>
						)}
					</>
				)}
			</main>

			<footer className="mx-auto mt-10 max-w-[1600px] border-t border-[var(--color-border)] px-4 py-6 text-center text-xs text-[var(--color-muted-foreground)] sm:px-6 lg:px-8">
				Visagino All Inclusive 2026 · {isDoubles ? "Dvejetų" : "Vienetų"}{" "}
				turnyras · Grupių etapas
			</footer>
		</div>
	);
}

export default App;
