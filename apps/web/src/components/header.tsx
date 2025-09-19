import { Link, useNavigate } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { useAuth } from "@/contexts/auth-context";

export default function Header() {
	const { isAuthenticated, login, logout } = useAuth();
	const navigate = useNavigate();
	
	const links = [
		{ to: "/landing", label: "Home" },
		...(isAuthenticated ? [
			{ to: "/dashboard", label: "Dashboard" },
			{ to: "/pull-requests", label: "Pull Requests" },
			{ to: "/analysis", label: "Analysis" },
			{ to: "/repositories", label: "Repositories" },
		] : []),
	] as const;

	return (
		<div className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-row items-center justify-between py-4">
					<nav className="flex gap-6 text-sm font-medium">
						{links.map(({ to, label }) => {
							return (
								<Link 
									key={to} 
									to={to}
									className="text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-white/50"
									activeProps={{
										className: "text-blue-600 font-semibold bg-white/60"
									}}
								>
									{label}
								</Link>
							);
						})}
					</nav>
					<div className="flex items-center gap-3">
						{!isAuthenticated ? (
							<button
								onClick={login}
								className="px-4 py-2 text-sm font-medium rounded-lg bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
							>
								Sign in with GitHub
							</button>
						) : (
							<>
								<button
									onClick={() => {
										logout();
										// Small delay to ensure state updates before navigation
										setTimeout(() => {
											navigate({ to: "/landing" });
										}, 100);
									}}
									className="px-4 py-2 text-sm font-medium rounded-lg bg-white/60 hover:bg-white/80 border border-white/30 text-gray-700 hover:text-gray-900 transition-all duration-200 backdrop-blur-sm shadow-sm"
								>
									Logout
								</button>
							</>
						)}
						<div className="bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-white/30">
							<ModeToggle />
						</div>
					</div>
				</div>
				{/* Centered shorter border */}
				<div className="flex justify-center">
					<div className="w-24 h-px bg-gradient-to-r from-orange-200 via-yellow-200 to-pink-200"></div>
				</div>
			</div>
		</div>
	);
}
