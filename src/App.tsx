import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupTable } from "@/components/GroupTable";
import { FinalStage } from "@/components/FinalStage";
import { TOURNAMENT_DATA, getAllDivisions } from "@/data/tournament";
import { useMatches } from "@/hooks/useMatches";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

function App() {
	const divisions = useMemo(() => getAllDivisions(), []);
	const { theme, toggleTheme } = useTheme();

	// Admin mode: check URL param ?mode=admin
	const [isAdmin] = useState(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get("mode") === "admin";
	});

	const [activeDivision, setActiveDivision] = useState(divisions[0]?.id || "");

	const division = TOURNAMENT_DATA.divisions[activeDivision];
	const { matches, loading } = useMatches(activeDivision);

	if (!division) return null;

	const groupNames = Object.keys(division.groups);

	return (
		<div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
			{/* Header */}
			<header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-50">
				<div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-bold text-gray-900 dark:text-white">
							{TOURNAMENT_DATA.tournamentName}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
							Grupių Etapas &middot; Group Stage
						</p>
					</div>
					<div className="flex items-center gap-3">
						{isAdmin && (
							<span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded font-medium">
								Admin Mode
							</span>
						)}
						<button
							type="button"
							onClick={toggleTheme}
							className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-label="Toggle theme"
						>
							{theme === "dark" ? (
								<Sun className="w-4 h-4" />
							) : (
								<Moon className="w-4 h-4" />
							)}
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-[1600px] mx-auto px-4 py-6">
				{/* Division Switcher */}
				<Tabs
					value={activeDivision}
					onValueChange={setActiveDivision}
					className="mb-6"
				>
					<TabsList className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 h-auto flex-wrap">
						{divisions.map((div) => (
							<TabsTrigger
								key={div.id}
								value={div.id}
								className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-gray-500 dark:text-gray-400 px-4 py-2 text-sm"
							>
								{div.name}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

				{/* Loading */}
				{loading && (
					<div className="flex items-center justify-center py-20">
						<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
					</div>
				)}

				{!loading && (
					<>
						<FinalStage
							division={division}
							matches={matches}
							isAdmin={isAdmin}
						/>

						{/* Group Tables */}
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
			</main>

			{/* Footer */}
			<footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
				Visagino All Inclusive 2026 &middot; Vienetų Turnyras &middot; Group
				Stage
			</footer>
		</div>
	);
}

export default App;
