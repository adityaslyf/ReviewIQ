import { Link, useNavigate } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import { useAuth } from "@/contexts/auth-context";

export default function Header() {
	const { isAuthenticated, login, logout } = useAuth();
	const navigate = useNavigate();
	const links = [
		{ to: "/landing", label: "Home" },
		...(isAuthenticated ? [{ to: "/", label: "Dashboard" }] : []),
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					{!isAuthenticated ? (
						<button
							onClick={login}
							className="px-3 py-1.5 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800"
						>
							Sign in with GitHub
						</button>
					) : (
						<>
							<Link to="/" className="px-3 py-1.5 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800">
								Dashboard
							</Link>
							<button
								onClick={() => {
									logout();
									// Small delay to ensure state updates before navigation
									setTimeout(() => {
										navigate({ to: "/landing" });
									}, 100);
								}}
								className="px-3 py-1.5 text-sm rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
