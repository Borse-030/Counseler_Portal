// import React from "react";
// import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
// import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
// import AssignmentIcon from "@mui/icons-material/Assignment";
// import DescriptionIcon from "@mui/icons-material/Description";
// import HandshakeIcon from "@mui/icons-material/Handshake";
// import BarChartIcon from "@mui/icons-material/BarChart";
// import NotificationsIcon from "@mui/icons-material/Notifications";
// import GroupsIcon from "@mui/icons-material/Groups";
// import SecurityIcon from "@mui/icons-material/Security";
// import "./LandingPage.css";

// const features = [
//     {
//         icon: AssignmentIcon,
//         title: "Counselling Cases",
//         description: "Manage and track counselling cases in one place.",
//     },
//     {
//         icon: CalendarMonthIcon,
//         title: "Appointments",
//         description: "Schedule and manage upcoming counselling sessions.",
//     },
//     {
//         icon: GroupsIcon,
//         title: "Beneficiaries",
//         description: "Maintain participant and couple information securely.",
//     },
//     {
//         icon: HandshakeIcon,
//         title: "Counselling",
//         description: "Keep counselling activities and case progress organized.",
//     },
//     {
//         icon: DescriptionIcon,
//         title: "Case Records",
//         description: "Access important notes, documents and case history.",
//     },
//     {
//         icon: BarChartIcon,
//         title: "Reports",
//         description: "View insights and reports across counselling programs.",
//     },
//     {
//         icon: NotificationsIcon,
//         title: "Notifications",
//         description: "Stay informed about appointments and case updates.",
//     },
//     {
//         icon: SecurityIcon,
//         title: "Secure Access",
//         description: "Role-based access keeps information protected.",
//     },
// ];

// const LandingPage = () => {
//     return (
//         <main className="landing-page">
//             {/* Navbar */}
//             {/* <header className="navbar">
//                 <div className="brand">
//                     <div className="brand-mark">
//                         <HandshakeIcon size={20} />
//                     </div>

//                     <div>
//                         <strong>Marriage Counselling</strong>
//                         <span>Management Portal</span>
//                     </div>
//                 </div>

//                 <nav>
//                     <a href="#features">Features</a>
//                     <a href="#about">About</a>
//                     <a href="#help">Help</a>
//                 </nav>

//                 <button className="login-btn">
//                     Login
//                     <ArrowForwardIcon size={16} />
//                 </button>
//             </header> */}

//             {/* Hero */}
//             <section className="hero">
//                 <div className="hero-content">
//                     <span className="eyebrow">COUNSELLING MANAGEMENT SYSTEM</span>

//                     <h1>
//                         Supporting better
//                         <span> counselling outcomes.</span>
//                     </h1>

//                     <p>
//                         A centralized platform to manage counselling cases, appointments,
//                         beneficiaries and program activities efficiently.
//                     </p>

//                     <div className="hero-actions">
//                         <button className="primary-btn">
//                             Access Portal
//                             <ArrowForwardIcon size={17} />
//                         </button>

//                         <button className="secondary-btn">
//                             Learn More
//                         </button>
//                     </div>
//                 </div>

//                 <div className="hero-visual">
//                     <div className="visual-header">
//                         <div>
//                             <span>PORTAL OVERVIEW</span>
//                             <h3>Today's Activity</h3>
//                         </div>

//                         <div className="status-dot" />
//                     </div>

//                     <div className="mini-stats">
//                         <div>
//                             <strong>24</strong>
//                             <span>Active Cases</span>
//                         </div>

//                         <div>
//                             <strong>08</strong>
//                             <span>Sessions Today</span>
//                         </div>
//                     </div>

//                     <div className="activity">
//                         <div className="activity-icon">
//                             <CalendarMonthIcon size={17} />
//                         </div>

//                         <div>
//                             <strong>Upcoming Sessions</strong>
//                             <span>3 counselling sessions scheduled</span>
//                         </div>

//                         <ArrowForwardIcon size={17} />
//                     </div>
//                 </div>
//             </section>

//             {/* Features */}
//             <section className="features-section" id="features">
//                 <div className="section-heading">
//                     <div>
//                         <span className="eyebrow">ONE PLATFORM</span>
//                         <h2>Everything you need to manage counselling.</h2>
//                     </div>

//                     <p>
//                         Designed to simplify day-to-day operations and keep important
//                         counselling information organized.
//                     </p>
//                 </div>

//                 <div className="feature-grid">
//                     {features.map((feature) => {
//                         const Icon = feature.icon;

//                         return (
//                             <article className="feature-card" key={feature.title}>
//                                 <div className="feature-icon">
//                                     <Icon size={20} />
//                                 </div>

//                                 <div>
//                                     <h3>{feature.title}</h3>
//                                     <p>{feature.description}</p>
//                                 </div>

//                                 <ArrowForwardIcon className="card-arrow" size={17} />
//                             </article>
//                         );
//                     })}
//                 </div>
//             </section>

//             {/* CTA */}
//             <section className="cta" id="about">
//                 <div>
//                     <span className="eyebrow">GET STARTED</span>
//                     <h2>Everything in one place.</h2>
//                     <p>
//                         Access the counselling management portal to begin managing your
//                         work efficiently.
//                     </p>
//                 </div>

//                 <button className="primary-btn">
//                     Login to Portal
//                     <ArrowForwardIcon size={17} />
//                 </button>
//             </section>

//             {/* Footer */}
//             <footer id="help">
//                 <div>
//                     <strong>Marriage Counselling Portal</strong>
//                     <span>Internal Management System</span>
//                 </div>

//                 <div className="footer-links">
//                     <a href="#features">Features</a>
//                     <a href="#about">About</a>
//                     <a href="#help">Help & Support</a>
//                 </div>

//                 <span className="copyright">
//                     © 2026. All rights reserved.
//                 </span>
//             </footer>
//         </main>
//     );
// };

// export default LandingPage;







import React from "react";
import {
	Box,
	Button,
	Card,
	CardContent,
	Container,
	Grid,
	Typography,
} from "@mui/material";

const services = [
	{
		title: "Marriage Counselling",
		description:
			"Get professional guidance to navigate challenges and build a healthier relationship.",
		icon: "♡",
	},
	{
		title: "Pre-Marital Counselling",
		description:
			"Prepare for married life with conversations around expectations, communication and compatibility.",
		icon: "◌",
	},
	{
		title: "Couples Support",
		description:
			"Work through communication gaps, conflicts and challenges together.",
		icon: "↗",
	},
	{
		title: "Find a Counsellor",
		description:
			"Connect with trained professionals who can support you through your journey.",
		icon: "◎",
	},
	{
		title: "Book a Session",
		description:
			"Choose a suitable time and take the first step towards getting support.",
		icon: "□",
	},
	{
		title: "Relationship Resources",
		description:
			"Explore helpful resources and guidance for stronger relationships.",
		icon: "≡",
	},
];

const LandingPage = () => {
	return (
		<Box
			sx={{
				minHeight: "100vh",
				backgroundColor: "#F8F7F3",
				color: "#252525",
			}}
		>
			{/* HERO */}
			<Container maxWidth="lg">
				<Box
					sx={{
						minHeight: { xs: "auto", md: "560px" },
						py: { xs: 6, md: 10 },
						display: "grid",
						gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
						alignItems: "center",
						gap: { xs: 5, md: 8 },
					}}
				>
					{/* Hero copy */}
					<Box>
						<Typography
							component="h1"
							sx={{
								fontSize: { xs: "2.8rem", sm: "3.5rem", md: "4.5rem" },
								lineHeight: 1.05,
								fontWeight: 600,
								letterSpacing: "-2px",
								maxWidth: "650px",
								mb: 3,
							}}
						>
							A safe space for{" "}
							<Box component="span" sx={{ color: "#164A46" }}>
								better relationships.
							</Box>
						</Typography>

						<Typography
							sx={{
								color: "#66716E",
								fontSize: { xs: "1rem", md: "1.1rem" },
								lineHeight: 1.7,
								maxWidth: "540px",
								mb: 4,
							}}
						>
							Access professional marriage counselling and relationship
							support through a simple, confidential platform designed to help
							you take the next step.
						</Typography>

						<Box
							sx={{
								display: "flex",
								justifyContent: { xs: "center", sm: "left" },
								gap: 1.5,
								flexWrap: "wrap",
							}}
						>
							<Button
								variant="contained"
								sx={{
									backgroundColor: "#164A46",
									px: 3,
									py: 1.4,
									borderRadius: "8px",
									textTransform: "none",
									fontWeight: 600,
									"&:hover": {
										backgroundColor: "#103A37",
									},
								}}
							>
								Get Started →
							</Button>

							<Button
								variant="outlined"
								sx={{
									color: "#164A46",
									borderColor: "#D5DEDA",
									px: 3,
									py: 1.4,
									borderRadius: "8px",
									textTransform: "none",
									"&:hover": {
										borderColor: "#164A46",
									},
								}}
							>
								How it works
							</Button>
						</Box>
					</Box>

					{/* Hero visual */}
					<Box
						sx={{
							minHeight: { xs: "300px", md: "400px" },
							borderRadius: "18px",
							backgroundColor: "#164A46",
							position: "relative",
							overflow: "hidden",
							display: "flex",
							alignItems: "flex-end",
							p: { xs: 3, md: 4 },
						}}
					>
						{/* Decorative shapes */}
						<Box
							sx={{
								position: "absolute",
								width: "260px",
								height: "260px",
								borderRadius: "50%",
								backgroundColor: "rgba(255,255,255,0.06)",
								top: "-80px",
								right: "-60px",
							}}
						/>

						<Box
							sx={{
								position: "absolute",
								width: "180px",
								height: "180px",
								borderRadius: "50%",
								backgroundColor: "rgba(196,134,90,0.25)",
								bottom: "-70px",
								left: "-50px",
							}}
						/>

						<Box
							sx={{
								position: "relative",
								zIndex: 1,
								width: "100%",
								backgroundColor: "rgba(255,255,255,0.96)",
								borderRadius: "12px",
								p: 3,
							}}
						>
							<Typography
								sx={{
									color: "#C4865A",
									fontSize: "0.7rem",
									fontWeight: 700,
									letterSpacing: "1px",
									mb: 1,
								}}
							>
								TAKE THE FIRST STEP
							</Typography>

							<Typography
								sx={{
									color: "#252525",
									fontSize: "1.35rem",
									fontWeight: 600,
									mb: 1,
								}}
							>
								How can we support you?
							</Typography>

							<Typography
								sx={{
									color: "#66716E",
									fontSize: "0.85rem",
									lineHeight: 1.5,
								}}
							>
								Find the right kind of support for where you are in your
								relationship journey.
							</Typography>
						</Box>
					</Box>
				</Box>
			</Container>

			{/* SERVICES */}
			{/* SERVICES */}
			<Box
				sx={{
					backgroundColor: "#FFFFFF",
					borderTop: "1px solid #E5E9E7",
					borderBottom: "1px solid #E5E9E7",
				}}
			>
				<Container maxWidth="lg">
					<Box sx={{ py: { xs: 6, md: 9 } }} id="services">
						<Box
							sx={{
								display: { xs: "block", md: "flex" },
								justifyContent: "space-between",
								alignItems: "flex-end",
								gap: 5,
								mb: 5,
							}}
						>
							<Box>
								<Typography
									component="h2"
									sx={{
										fontSize: { xs: "2rem", md: "2.7rem" },
										lineHeight: 1.15,
										fontWeight: 600,
										letterSpacing: "-1px",
									}}
								>
									Support for every stage.
								</Typography>

								<Typography
									sx={{
										color: "#66716E",
										lineHeight: 1.6,
										mt: { xs: 2, md: 0 },
									}}
								>
									Whether you're preparing for marriage or navigating challenges
									together, find the support that fits your needs.
								</Typography>
							</Box>
						</Box>

						{/* CARD GRID */}
						<Grid container spacing={2} sx={{ display: "flex", justifyContent: "center" }}>
							{services.map((service, index) => (
								<Grid
									item
									xs={12}
									sm={6}
									md={4}
									key={service.title}
									sx={{
										animation: "cardEnter 0.5s ease both",
										animationDelay: `${index * 80}ms`,
										"@keyframes cardEnter": {
											from: {
												opacity: 0,
												transform: "translateY(18px)",
											},
											to: {
												opacity: 1,
												transform: "translateY(0)",
											},
										},
									}}
								>
									<Card
										elevation={0}
										sx={{
											height: "100%",
											minHeight: 205,
											border: "1px solid #E0E6E3",
											borderRadius: "10px",
											position: "relative",
											overflow: "hidden",
											transition:
												"transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
											cursor: "pointer",

											"&:hover": {
												transform: "translateY(-6px)",
												borderColor: "#B8C9C5",
												boxShadow: "0 12px 30px rgba(22, 74, 70, 0.08)",

												"& .service-icon": {
													backgroundColor: "#164A46",
													color: "#FFFFFF",
													transform: "scale(1.05)",
												},

												"& .service-arrow": {
													transform: "translateX(4px)",
													opacity: 1,
												},
											},
										}}
									>
										<CardContent
											sx={{
												p: 3,
												height: "100%",
												display: "flex",
												flexDirection: "column",
											}}
										>
											{/* Icon */}
											<Box
												className="service-icon"
												sx={{
													width: 44,
													height: 44,
													borderRadius: "9px",
													backgroundColor: "#EDF3F1",
													color: "#164A46",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "1.25rem",
													mb: 3,
													transition: "all 220ms ease",
												}}
											>
												{service.icon}
											</Box>

											<Typography
												sx={{
													fontWeight: 600,
													fontSize: "1rem",
													mb: 1,
												}}
											>
												{service.title}
											</Typography>

											<Typography
												sx={{
													color: "#66716E",
													fontSize: "0.85rem",
													lineHeight: 1.6,
													maxWidth: "310px",
												}}
											>
												{service.description}
											</Typography>

											{/* Arrow */}
											<Box
												className="service-arrow"
												sx={{
													mt: "auto",
													pt: 2,
													color: "#164A46",
													fontSize: "1rem",
													opacity: 0.45,
													transition: "all 220ms ease",
												}}
											>
												→
											</Box>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					</Box>
				</Container>
			</Box>

			{/* HOW IT WORKS */}
			<Container maxWidth="lg">
				<Box
					sx={{
						py: { xs: 6, md: 9 },
					}}
					id="how-it-works"
				>
					<Typography
						sx={{
							color: "#C4865A",
							fontSize: "0.7rem",
							fontWeight: 700,
							letterSpacing: "1.5px",
							mb: 1.5,
						}}
					>
						HOW IT WORKS
					</Typography>

					<Typography
						component="h2"
						sx={{
							fontSize: { xs: "2rem", md: "2.7rem" },
							fontWeight: 600,
							letterSpacing: "-1px",
							mb: 5,
						}}
					>
						Getting started is simple.
					</Typography>

					<Grid container spacing={3}>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: {
									xs: "1fr",
									md: "repeat(3, 1fr)",
								},
								gap: 3,
							}}
						>
							{[
								{
									number: "01",
									title: "Tell us what you need",
									text: "Choose the type of support that best describes your situation.",
								},
								{
									number: "02",
									title: "Find the right support",
									text: "Explore available counselling options and professionals.",
								},
								{
									number: "03",
									title: "Take the next step",
									text: "Book a session and begin your journey towards a healthier relationship.",
								},
							].map((step) => (
								<Box
									key={step.number}
									sx={{
										borderTop: "1px solid #DDE5E2",
										pt: 2.5,
									}}
								>
									<Typography
										sx={{
											color: "#C4865A",
											fontWeight: 700,
											fontSize: "0.8rem",
											mb: 2,
										}}
									>
										{step.number}
									</Typography>

									<Typography
										sx={{
											fontWeight: 600,
											fontSize: "1.1rem",
											mb: 1,
										}}
									>
										{step.title}
									</Typography>

									<Typography
										sx={{
											color: "#66716E",
											fontSize: "0.9rem",
											lineHeight: 1.6,
										}}
									>
										{step.text}
									</Typography>
								</Box>
							))}
						</Box>
					</Grid>
				</Box>
			</Container>

			{/* TRUST / CTA */}
			<Box
				sx={{
					backgroundColor: "#164A46",
					color: "#FFFFFF",
				}}
			>
				<Container maxWidth="lg">
					<Box
						sx={{
							py: { xs: 6, md: 8 },
							display: { xs: "block", md: "flex" },
							alignItems: "center",
							justifyContent: "space-between",
							gap: 5,
						}}
					>
						<Box>
							<Typography
								sx={{
									color: "#DDB184",
									fontSize: "0.7rem",
									fontWeight: 700,
									letterSpacing: "1.5px",
									mb: 1.5,
								}}
							>
								A PRIVATE & SUPPORTIVE SPACE
							</Typography>

							<Typography
								component="h2"
								sx={{
									fontSize: { xs: "2rem", md: "2.8rem" },
									fontWeight: 500,
									letterSpacing: "-1px",
									mb: 1.5,
								}}
							>
								You don't have to figure it out alone.
							</Typography>

							<Typography
								sx={{
									color: "rgba(255,255,255,0.7)",
									maxWidth: "560px",
									lineHeight: 1.6,
								}}
							>
								Take the first step towards understanding, communication and
								a stronger relationship.
							</Typography>
						</Box>

						<Button
							variant="contained"
							sx={{
								mt: { xs: 3, md: 0 },
								flexShrink: 0,
								backgroundColor: "#FFFFFF",
								color: "#164A46",
								px: 3,
								py: 1.5,
								borderRadius: "8px",
								textTransform: "none",
								fontWeight: 600,
								"&:hover": {
									backgroundColor: "#F2F2F2",
								},
							}}
						>
							Get Started →
						</Button>
					</Box>
				</Container>
			</Box>
			{/* FOOTER */}
			<Box
				component="footer"
				sx={{
					backgroundColor: "#F8F7F3",
					borderTop: "1px solid #E0E6E3",
				}}
			>
				<Container maxWidth="lg">
					<Box
						sx={{
							py: 4,
							display: { xs: "block", md: "flex" },
							alignItems: "center",
							justifyContent: "space-between",
							gap: 3,
						}}
					>
						{/* Brand */}
						<Box>
							<Typography
								sx={{
									fontWeight: 600,
									fontSize: {xs:"1.5rem", sm:"1.2rem"},
									color: "#164A46",
									display:"flex",
								justifyContent:{xs:"center", sm:"left"},
								}}
							>
								MindEase
							</Typography>

							<Typography
								sx={{
									color: "#66716E",
									fontSize: "0.75rem",
									mt: 0.5,
									display:{xs:"none", sm:"block"}
								}}
							>
								A safe space for better relationships.
							</Typography>
						</Box>

						{/* Links */}
						<Box
							sx={{
								display: "flex",
								gap: { xs: 2.5, md: 4 },
								flexWrap: "wrap",
								mt: { xs: 3, md: 0 },
								display:"flex",
								justifyContent:{xs:"center", sm:"left"},
							}}
						>
							{[
								{ label: "Home", href: "#home" },
								{ label: "How it works", href: "#how-it-works" },
								{ label: "Services", href: "#services" },
							].map((link) => (
								<Typography
									key={link.label}
									component="a"
									href={link.href}
									sx={{
										color: "#66716E",
										fontSize: "0.78rem",
										textDecoration: "none",
										transition: "color 150ms ease",
							
										"&:hover": {
											color: "#164A46",
										},
									}}
								>
									{link.label}
								</Typography>
							))}
						</Box>

						{/* Copyright */}
						<Typography
							sx={{
								color: "#8A9491",
								fontSize: "0.7rem",
								mt: { xs: 3, md: 0 },
								whiteSpace: "nowrap",
								display: "flex",
								justifyContent: { xs: "center", sm: "left" },
							}}
						>
							© 2026 All rights reserved.
						</Typography>
					</Box>
				</Container>
			</Box>
		</Box>
	);
};

export default LandingPage;