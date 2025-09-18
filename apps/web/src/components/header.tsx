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
		<div>
			<div className="flex flex-row items-center justify-between px-4 py-2">
				<nav className="flex gap-6 text-sm">
					{links.map(({ to, label }) => {
						return (
							<Link 
								key={to} 
								to={to}
								className="hover:text-blue-600 transition-colors"
								activeProps={{
									className: "text-blue-600 font-medium"
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
							className="px-4 py-2 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
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
								className="px-4 py-2 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
							>
								Logout
							</button>
						</>
					)}
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
