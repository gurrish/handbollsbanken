import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

export type Locale = "sv" | "en";

const translations: Record<string, string> = {
  "Overview": "Översikt",
  "Exercise library": "Övningsbank",
  "Training planner": "Träningsplanering",
  "Teams I’m interested in": "Lag jag är intresserad av",
  "Only trainings for selected teams are shown.": "Endast träningar för valda lag visas.",
  "Save team selection": "Spara lagval",
  "for selected teams": "för valda lag",
  "selected": "valda",
  "No teams selected": "Inga lag valda",
  "Select one or more teams above to see their planned trainings.": "Välj ett eller flera lag ovan för att se deras planerade träningar.",
  "Choose teams": "Välj lag",
  "Team preferences saved.": "Lagvalen har sparats.",
  "Edit team": "Redigera lag",
  "Save team": "Spara lag",
  "Team updated.": "Laget har uppdaterats.",
  "Total duration (minutes)": "Total längd (minuter)",
  "Choose an exercise…": "Välj en övning…",
  "All exercises added": "Alla övningar tillagda",
  "Add exercises from the dropdown and set how many minutes to spend on each one.": "Lägg till övningar i listan och ange hur många minuter varje övning ska ta.",
  "SESSION FLOW · SET DURATION AND REORDER": "TRÄNINGENS UPPLÄGG · ANGE TID OCH ÄNDRA ORDNING",
  "The total exercise time must be between 15 and 300 minutes.": "Den totala övningstiden måste vara mellan 15 och 300 minuter.",
  "Edit display name": "Ändra visningsnamn",
  "Choose the name other club members will see. Your sign-in email will not change.": "Välj namnet som andra klubbmedlemmar ser. Din inloggningsadress ändras inte.",
  "Display name": "Visningsnamn",
  "Sign-in email": "Inloggningsadress",
  "Save display name": "Spara visningsnamn",
  "Display name updated.": "Visningsnamnet har uppdaterats.",
  "Shared training": "Delat träningspass",
  "SHARED TRAINING · CLUB MEMBERS": "DELADE TRÄNINGSPASS · KLUBBMEDLEMMAR",
  "Training unavailable": "Träningspasset är inte tillgängligt",
  "This training may have been removed, or you may not have access to its club.": "Träningspasset kan ha tagits bort eller så saknar du åtkomst till klubben.",
  "Shared exercise": "Delad övning",
  "SHARED EXERCISE · CLUB MEMBERS": "DELAD ÖVNING · KLUBBMEDLEMMAR",
  "Exercise unavailable": "Övningen är inte tillgänglig",
  "This exercise may have been removed, or you may not have access to its club.": "Övningen kan ha tagits bort eller så saknar du åtkomst till klubben.",
  "Copy link": "Kopiera länk",
  "Training link copied. Only signed-in club members can open it.": "Länken har kopierats. Endast inloggade klubbmedlemmar kan öppna den.",
  "Exercise link copied. Only signed-in club members can open it.": "Övningslänken har kopierats. Endast inloggade klubbmedlemmar kan öppna den.",
  "Could not copy the link. Check clipboard permissions and try again.": "Det gick inte att kopiera länken. Kontrollera urklippets behörigheter och försök igen.",
  "Edit details": "Redigera detaljer",
  "Export PDF": "Exportera PDF",
  "Exercise diagram": "Övningsdiagram",
  "This link is for signed-in members with access to this club. It won’t make the exercise public.": "Länken är till för inloggade medlemmar i klubben. Övningen blir inte offentlig.",
  "COACH’S NOTES": "TRÄNARANTECKNINGAR",
  "SESSION FLOW": "TRÄNINGSPASSETS UPPLÄGG",
  "This session has no exercises yet.": "Träningspasset innehåller inga övningar ännu.",
  "This link is for signed-in members with access to this club. It won’t make the training public.": "Länken är till för inloggade medlemmar i klubben. Träningspasset blir inte offentligt.",
  "Open": "Öppna",
  "Share": "Dela",
  "Diagram editor": "Diagramredigerare",
  "Club admin": "Klubbadministratör",
  "Club administration": "Klubbadministration",
  "Club administrator": "Klubbadministratör",
  "Club": "Klubb",
  "Global admin": "Global administratör",
  "Global workspace": "Global arbetsyta",
  "Club workspace": "Klubbens arbetsyta",
  "WORKSPACE": "ARBETSUTRYMME",
  "Experience issues?": "Problem med appen?",
  "Report a bug": "Rapportera ett fel",
  "Sign out": "Logga ut",
  "Sign in": "Logga in",
  "Workspace": "Arbetsyta",
  "Close navigation": "Stäng navigeringen",
  "Close menu": "Stäng menyn",
  "Open menu": "Öppna menyn",
  "Dismiss": "Stäng meddelandet",
  "Coach": "Tränare",
  "Viewer": "Läsbehörig",
  "pending": "Väntar",
  "approved": "Godkänd",
  "rejected": "Avslagen",
  "Beginner": "Nybörjare",
  "Intermediate": "Medel",
  "Advanced": "Avancerad",
  "Attack": "Anfall",
  "Passing": "Passningar",
  "Shooting": "Skott",
  "Defense": "Försvar",
  "Warm-up": "Uppvärmning",
  "Footwork": "Fotarbete",
  "All ages": "Alla åldrar",
  "All categories": "Alla kategorier",
  "All levels": "Alla nivåer",
  "Date to be decided": "Datum bestäms senare",
  "Getting your court ready…": "Vi gör planen redo…",
  "YOUR NEXT MOVE": "NÄSTA STEG",
  "Find your handball": "Hitta din handbolls",
  "community.": "gemenskap.",
  "Choose your club and request access. A club admin will review your request before you can start planning.": "Välj din klubb och skicka en medlemsförfrågan. En klubbadministratör granskar den innan du kan börja planera.",
  "Request sent": "Förfrågan skickad",
  "Your request to join": "Din förfrågan om att gå med i",
  "is waiting for approval.": "väntar på godkännande.",
  "Request not approved": "Förfrågan godkändes inte",
  "Your previous request was declined. You can request access to another club.": "Din tidigare förfrågan avslogs. Du kan ansöka om medlemskap i en annan klubb.",
  "Request sent to your club admin.": "Förfrågan har skickats till klubbadministratören.",
  "Choose your club": "Välj din klubb",
  "Select a club…": "Välj en klubb…",
  "No clubs have been added yet. Ask your Global Admin to create one.": "Det finns inga klubbar ännu. Be en global administratör att skapa en.",
  "Sending…": "Skickar…",
  "Request to join": "Ansök om medlemskap",
  "Signed in as": "Inloggad som",
  "MADE FOR THE LOVE OF HANDBALL": "SKAPAD FÖR KÄRLEKEN TILL HANDBOLL",
  "your club": "din klubb",
  "Unable to load your club.": "Det gick inte att läsa in din klubb.",
  "Something went wrong.": "Något gick fel.",
  "Delete “": "Ta bort ”",
  "”? This cannot be undone.": "”? Åtgärden kan inte ångras.",
  "”?": "”?",
  "Exercise deleted.": "Övningen har tagits bort.",
  "Session deleted.": "Träningspasset har tagits bort.",
  "Choose an exercise first.": "Välj en övning först.",
  "Diagram saved to exercise.": "Diagrammet har sparats i övningen.",
  "Club created.": "Klubben har skapats.",
  "Rename club": "Byt namn på klubben",
  "Club name updated.": "Klubbnamnet har uppdaterats.",
  "Team created.": "Laget har skapats.",
  "Coach approved.": "Tränaren har godkänts.",
  "Request declined.": "Förfrågan har avslagits.",
  "Role updated.": "Rollen har uppdaterats.",
  "Exercise updated.": "Övningen har uppdaterats.",
  "Exercise added.": "Övningen har lagts till.",
  "Training session saved.": "Träningspasset har sparats.",
  "Session updated.": "Träningspasset har uppdaterats.",
  "Saving…": "Sparar…",
  "YOUR COACHING SPACE": "DIN TRÄNARARBETSPLATS",
  "Good to see you,": "Kul att se dig,",
  "A fresh week is a good time to get your team moving.": "En ny vecka är ett perfekt tillfälle att få laget i rörelse.",
  "Plan a session": "Planera ett träningspass",
  "YOUR CLUB AT A GLANCE": "DIN KLUBB I KORTHET",
  "Practice, in good shape.": "Träningen under kontroll.",
  "A little progress every session": "Små framsteg vid varje träning",
  "Sessions planned": "Planerade träningspass",
  "Across your teams": "För alla dina lag",
  "Exercises in library": "Övningar i övningsbanken",
  "Ready for the court": "Redo för planen",
  "Active teams": "Aktiva lag",
  "Library built": "Övningsbanken fylld",
  "Keep adding your favourites": "Lägg till fler favoriter",
  "UP NEXT": "HÄRNÄST",
  "Your upcoming sessions": "Kommande träningspass",
  "View planner": "Visa planeringen",
  "Your court is open": "Planen väntar på er",
  "Create your first session and get the team moving.": "Skapa ert första träningspass och få laget i rörelse.",
  "QUICK START": "SNABBSTART",
  "What are we working on?": "Vad ska vi träna på?",
  "Jump straight into the good stuff.": "Kom snabbt igång med planeringen.",
  "Find an exercise": "Hitta en övning",
  "Explore your club’s library": "Utforska klubbens övningsbank",
  "Sketch a play": "Rita upp ett spel",
  "Show the team your idea": "Visa laget din idé",
  "A LITTLE REMINDER": "EN LITEN PÅMINNELSE",
  "“Great teams are built one good repetition at a time.”": "”Starka lag byggs en bra repetition i taget.”",
  "Take it one drill at a time.": "Ta en övning i taget.",
  "Coach request to review": "Tränarförfrågan att granska",
  "Coach requests to review": "Tränarförfrågningar att granska",
  "Your club is waiting on you": "Klubben väntar på ditt svar",
  "Team": "Lag",
  "Exercise": "Övning",
  "exercises": "övningar",
  " min": " min",
  "THE CLUB PLAYBOOK": "KLUBBENS ÖVNINGSBANK",
  "Good ideas are worth keeping. Find a drill, make it yours, and get the team moving.": "Bra idéer är värda att spara. Hitta en övning, anpassa den och få laget i rörelse.",
  "Add exercise": "Lägg till övning",
  "Search exercises, skills or tags…": "Sök efter övningar, färdigheter eller taggar…",
  "FILTER BY": "FILTRERA",
  "Filter by age group": "Filtrera efter åldersgrupp",
  "Filter by category": "Filtrera efter kategori",
  "Filter by complexity": "Filtrera efter svårighetsgrad",
  "No drills match those filters": "Inga övningar matchar filtreringen",
  "Start your club’s playbook": "Bygg klubbens övningsbank",
  "Try widening your search or filters.": "Prova att bredda sökningen eller filtreringen.",
  "Add your first exercise so coaches can build it into a session.": "Lägg till den första övningen så att tränarna kan använda den i ett träningspass.",
  "Clear filters": "Rensa filtreringen",
  "SHOWING": "VISAR",
  "OF": "AV",
  "EXERCISES": "ÖVNINGAR",
  "SHARED WITH YOUR CLUB": "DELAS MED DIN KLUBB",
  "A club drill, ready to take to the court.": "En klubbövning, redo att användas på planen.",
  "View exercise": "Visa övning",
  "Edit": "Redigera",
  "Delete": "Ta bort",
  "Exercise details": "Övningsdetaljer",
  "Edit exercise": "Redigera övning",
  "Add an exercise": "Lägg till en övning",
  "Build a drill your whole club can put to use.": "Skapa en övning som hela klubben kan använda.",
  "A drill shared with your club.": "En övning som delas med klubben.",
  "Exercise name": "Övningens namn",
  "e.g. Three-lane passing": "t.ex. Passningar i tre led",
  "What’s the idea?": "Beskriv övningen",
  "Describe the setup, movement and coaching points…": "Beskriv upplägg, rörelser och viktiga tränarpunkter…",
  "Age group": "Åldersgrupp",
  "Category": "Kategori",
  "Complexity": "Svårighetsgrad",
  "Tags": "Taggar",
  "Separate tags with commas": "Separera taggar med kommatecken",
  "e.g. passing, speed": "t.ex. passningar, snabbhet",
  "Cancel": "Avbryt",
  "Close": "Stäng",
  "Save changes": "Spara ändringar",
  "Add to library": "Lägg till i övningsbanken",
  "MAKE TIME FOR THE GOOD STUFF": "GE PLATS ÅT DET VIKTIGA",
  "Build a practice that flows — from first whistle to final stretch.": "Planera ett träningspass med bra flyt – från första visslan till sista nedvarvningen.",
  "sessions": "träningspass",
  "planned for your club": "planerade för klubben",
  "court time scheduled": "minuter planerade på planen",
  "teams": "lag",
  "ready to get moving": "redo att komma igång",
  "No sessions on the calendar": "Inga träningspass i kalendern",
  "Put together a practice and make the most of your court time.": "Sätt ihop ett träningspass och ta vara på tiden på planen.",
  "Plan your first session": "Planera ditt första träningspass",
  "Add exercises to map out your session flow.": "Lägg till övningar för att planera träningspassets upplägg.",
  "Edit training session": "Redigera träningspass",
  "Make a plan, save it as a draft, and come back to fine-tune it.": "Skapa en plan som utkast och kom tillbaka när du vill finslipa den.",
  "Build or adjust this session here, then save it to the calendar.": "Skapa eller ändra träningspasset här och spara det sedan i kalendern.",
  "Save a training template and schedule copies for any team and date.": "Spara en träningsmall och schemalägg kopior för valfritt lag och datum.",
  "Edit training": "Redigera träningspass",
  "Cancel edit": "Avbryt redigering",
  "Create training template": "Skapa träningsmall",
  "Training templates": "Träningsmallar",
  "For selected teams": "För valda lag",
  "No training templates match the selected teams’ age groups.": "Inga träningsmallar matchar de valda lagens åldersgrupper.",
  "Choose an age group…": "Välj en åldersgrupp…",
  "Age group needed": "Åldersgrupp krävs",
  "Training template": "Träningsmall",
  "TRAINING TEMPLATE": "TRÄNINGSMALL",
  "READY-TO-USE PRACTICES": "FÄRDIGA TRÄNINGSPASS",
  "Add to calendar": "Lägg till i kalendern",
  "Edit training template": "Redigera träningsmall",
  "Edit template": "Redigera mall",
  "Add training template to calendar": "Lägg till träningsmall i kalendern",
  "This creates a scheduled copy; the training template stays unchanged.": "Detta skapar en schemalagd kopia. Träningsmallen förblir oförändrad.",
  "Add exercise from library": "Lägg till övning från övningsbanken",
  "Search exercises…": "Sök övningar…",
  "Choose a matching exercise": "Välj en matchande övning",
  "Add free-text exercise": "Lägg till övning som fritext",
  "Type an exercise name": "Skriv ett övningsnamn",
  "Add text": "Lägg till text",
  "Free-text exercise": "Fritextövning",
  "Free-text exercise.": "Fritextövning.",
  "Create template": "Skapa träningsmall",
  "Save template": "Spara träningsmall",
  "Template created.": "Träningsmallen har skapats.",
  "Template updated.": "Träningsmallen har uppdaterats.",
  "Template deleted.": "Träningsmallen har tagits bort.",
  "Session name": "Träningspassets namn",
  "e.g. Fast breaks & finishing": "t.ex. Kontringar och avslut",
  "Choose team…": "Välj lag…",
  "Date": "Datum",
  "Duration (minutes)": "Längd (minuter)",
  "Add exercises": "Lägg till övningar",
  "· OPTIONAL": "· VALFRITT",
  "Add exercises in your club library first.": "Lägg först till övningar i klubbens övningsbank.",
  "SESSION FLOW · MOVE TO REORDER": "TRÄNINGSPASSETS UPPLÄGG · FLYTTA FÖR ATT ÄNDRA ORDNING",
  "Move exercise up": "Flytta övningen uppåt",
  "Move exercise down": "Flytta övningen nedåt",
  "Coach’s notes": "Tränaranteckningar",
  "Focus points, equipment, or anything to remember…": "Fokusområden, utrustning eller annat att komma ihåg…",
  "Save session": "Spara träningspass",
  "Ask a club admin to add a team before scheduling a session.": "Be en klubbadministratör att lägga till ett lag innan du planerar ett träningspass.",
  "DRAW IT. SHOW IT. PLAY IT.": "RITA. VISA. SPELA.",
  "Give a great idea a shape. Sketch a movement, drag your markers and save it to a drill.": "Ge en bra idé form. Rita en rörelse, flytta markörerna och spara diagrammet till en övning.",
  "SAVING TO EXERCISE": "SPARAR I ÖVNINGEN",
  "PICK AN EXERCISE": "VÄLJ EN ÖVNING",
  "Add a drill to get started": "Lägg till en övning för att komma igång",
  "Your court is ready when you are. Create an exercise and bring it to life here.": "Planen är redo. Skapa en övning och ge den liv här.",
  "Open exercise library": "Öppna övningsbanken",
  "COURT SKETCH": "PLANRITNING",
  "SAVES WITH EXERCISE": "SPARAS MED ÖVNINGEN",
  "EXERCISE": "ÖVNING",
  "You have view-only access to diagrams.": "Du har endast läsbehörighet till diagram.",
  "Diagram could not be saved.": "Det gick inte att spara diagrammet.",
  "Saving your diagram…": "Sparar diagrammet…",
  "Player": "Spelare",
  "Goalkeeper": "Målvakt",
  "Pass": "Passning",
  "Movement": "Förflyttning",
  "A clear picture makes a better play.": "En tydlig bild gör spelet lättare att förstå.",
  "Keep it simple.": "Håll det enkelt.",
  "A few well-placed markers make a play easier to understand.": "Några välplacerade markörer gör spelet lättare att förstå.",
  "KEEP YOUR CLUB IN GOOD SHAPE": "HÅLL ORDNING PÅ KLUBBEN",
  "Welcome the right people in, keep your teams organised, and let the good sessions happen.": "Välkomna nya medlemmar, håll ordning på lagen och skapa bra träningspass.",
  "Your clubs": "Dina klubbar",
  "Create and grow your club spaces.": "Skapa klubbar och hjälp dem att växa.",
  "New club name": "Namn på ny klubb",
  "Add club": "Lägg till klubb",
  "Rename": "Byt namn",
  "GOOD PEOPLE, GREAT TEAMS": "BRA MÄNNISKOR, STARKA LAG",
  "Membership requests": "Medlemsförfrågningar",
  "Decline": "Avslå",
  "Approve": "Godkänn",
  "All caught up.": "Allt är uppdaterat.",
  "There are no membership requests waiting for review.": "Det finns inga medlemsförfrågningar att granska.",
  "Your teams": "Dina lag",
  "Keep the right group on the right plan.": "Håll ordning på grupper och träningsplaner.",
  "Team name, e.g. Girls U14": "Lagnamn, t.ex. Flickor U14",
  "Add team": "Lägg till lag",
  "Your first team can start here.": "Här kan du lägga till ditt första lag.",
  "THE PEOPLE BEHIND THE PLAYS": "MÄNNISKORNA BAKOM SPELET",
  "Club members": "Klubbmedlemmar",
  "MEMBER": "MEDLEM",
  "STATUS": "STATUS",
  "ROLE": "ROLL",
  "Your club’s circle will grow here.": "Här visas klubbens medlemmar.",
  "Approved coaches and viewers will show up in this list.": "Godkända tränare och läsbehöriga visas i listan.",
  "WELCOME TO HANDBOLLSBÄNKEN": "VÄLKOMMEN TILL HANDBOLLSBÄNKEN",
  "THE COURT IS YOURS": "PLANEN ÄR ER",
  "Good sessions": "Bra träningar",
  "start with a": "börjar med en",
  "good plan.": "bra plan.",
  "One home for your team’s drills, ideas and training plans.": "En plats för lagets övningar, idéer och träningsplaner.",
  "01 — PLAN": "01 — PLANERA",
  "02 — PRACTICE": "02 — TRÄNA",
  "03 — PLAY": "03 — SPELA",
  "Make every practice": "Gör varje träning",
  "a little better.": "lite bättre.",
  "Sign in with your account to plan, share and get your team on the same page.": "Logga in för att planera, dela och samla laget kring samma plan.",
  "Continue with Microsoft": "Fortsätt med Microsoft",
  "By signing in, you agree to keep your team’s training data within your club.": "När du loggar in hanteras lagets träningsdata inom din klubb.",
  "Built for the love of the game": "Skapad för kärleken till sporten",
  "Handbollsbanken · Built for the love of the game": "Handbollsbanken · Skapad för kärleken till sporten",
  "We couldn’t load your workspace": "Det gick inte att läsa in arbetsytan",
  "Check your connection and try again.": "Kontrollera anslutningen och försök igen.",
  "Try again": "Försök igen",
  "Get started": "Kom igång",
  "Add a marker from the toolbar": "Lägg till en markör från verktygsfältet",
  "Drag to move · Select and resize · Delete key to remove": "Dra för att flytta · Markera och ändra storlek · Tryck Delete för att ta bort",
  "Court markings and goals stay fixed": "Planens linjer och mål är fasta",
  "Drag to move · Select to resize or rotate · Delete key to remove": "Dra för att flytta · Markera för att ändra storlek eller rotera · Tryck Delete för att ta bort",
  "Rotate 15°": "Rotera 15°",
  "Add Player": "Lägg till spelare",
  "Add Goalkeeper": "Lägg till målvakt",
  "Add Cone": "Lägg till kon",
  "Add Goal": "Lägg till mål",
  "Add Ball": "Lägg till boll",
  "Add Arrow": "Lägg till pil",
  "Add Pass": "Lägg till passning",
  "Add Move": "Lägg till förflyttning",
  "Add Text": "Lägg till text",
  "Cone": "Kon",
  "Arrow": "Pil",
  "Move": "Flytta",
  "Text": "Text",
  "Clear": "Rensa",
  "Saved!": "Sparat!",
  "Save diagram": "Spara diagram",
  "THE COACH’S CORNER": "TRÄNARENS HÖRNA",
  "Sign in to continue.": "Logga in för att fortsätta.",
  "Invalid sign-in session.": "Inloggningssessionen är ogiltig.",
  "Your sign-in profile is missing an email address.": "Din inloggningsprofil saknar en e-postadress.",
  "Request body must be valid JSON.": "Förfrågans innehåll måste vara giltig JSON.",
  "Invalid request.": "Ogiltig förfrågan.",
  "You don't have permission to do that.": "Du saknar behörighet för att göra det.",
  "Your club membership is not approved.": "Ditt klubbmedlemskap har inte godkänts.",
  "You don't have access to this club.": "Du har inte åtkomst till den här klubben.",
  "You already belong to a club.": "Du tillhör redan en klubb.",
  "Club not found.": "Klubben hittades inte.",
  "You already have a request waiting for another club.": "Du har redan en väntande förfrågan till en annan klubb.",
  "Join request not found.": "Medlemsförfrågan hittades inte.",
  "A club with that name already exists.": "Det finns redan en klubb med det namnet.",
  "Exercise not found.": "Övningen hittades inte.",
  "Choose a team from your club.": "Välj ett lag från din klubb.",
  "Training plans can only use exercises from your club.": "Träningsplaner kan bara använda övningar från din klubb.",
  "Training plan not found.": "Träningspasset hittades inte.",
  "Club user not found.": "Klubbmedlemmen hittades inte.",
  "API endpoint not found.": "API-slutpunkten hittades inte.",
  "The request could not be completed.": "Det gick inte att slutföra förfrågan.",
  "Diagram must be a valid JSON array with at most 200 items.": "Diagrammet måste vara en giltig JSON-lista med högst 200 objekt.",
  "Date must be a valid calendar date.": "Datumet måste vara ett giltigt kalenderdatum.",
  "Exercises cannot be duplicated.": "Samma övning kan inte läggas till flera gånger.",
  "String must contain at least 2 character(s)": "Texten måste innehålla minst 2 tecken.",
  "String must contain at least 1 character(s)": "Texten måste innehålla minst 1 tecken.",
  "String must contain at most 100 character(s)": "Texten får innehålla högst 100 tecken.",
  "String must contain at most 2000 character(s)": "Texten får innehålla högst 2 000 tecken.",
  "Array must contain at most 50 element(s)": "Listan får innehålla högst 50 objekt.",
  "form": "formulär",
  " sessions": " träningspass",
  " teams": " lag",
  "planned": "planerade",
  "min": "min",
  " form": " formulär",
};

let currentLocale: Locale = "sv";
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "sv",
  setLocale: () => undefined,
});

function translate(value: string): string {
  if (currentLocale !== "sv") return value;
  const content = value.trim();
  if (!content) return value;
  const start = value.indexOf(content);
  let result = translations[content];
  if (!result && content.startsWith("Rename ")) result = `Byt namn på ${content.slice("Rename ".length)}`;
  if (!result && content.startsWith("Role for ")) result = `Roll för ${content.slice("Role for ".length)}`;
  if (!result && content.endsWith(" form")) result = `${content.slice(0, content.length - " form".length)} formulär`;
  if (!result && content.startsWith("Request failed (") && content.endsWith(").")) result = `Förfrågan misslyckades (${content.slice("Request failed (".length, -2)}).`;
  if (!result && content.startsWith("Delete “") && content.endsWith("”? This cannot be undone.")) {
    const title = content.slice("Delete “".length, content.length - "”? This cannot be undone.".length);
    result = `Ta bort ”${title}”? Åtgärden kan inte ångras.`;
  }
  if (!result && content.startsWith("Delete “") && content.endsWith("”?")) {
    const title = content.slice("Delete “".length, -2);
    result = `Ta bort ”${title}”?`;
  }
  return `${value.slice(0, start)}${result || content}${value.slice(start + content.length)}`;
}

export function translateText(value: string): string {
  return translate(value);
}

function translateTree(node: ReactNode): ReactNode {
  if (typeof node === "string") return translate(node);
  if (Array.isArray(node)) return node.map(translateTree);
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  if (node.props["data-no-translate"]) return node;

  const props = { ...node.props };
  if (node.type === "option" && typeof props.children === "string") {
    const optionValue = props.value;
    const isRoleOption = ["ClubAdmin", "Coach", "Viewer", "GlobalAdmin"].includes(String(optionValue));
    if (optionValue !== undefined && optionValue !== "" && !isRoleOption) return node;
    if (optionValue === undefined) props.value = props.children;
  }
  if (props.children !== undefined) props.children = translateTree(props.children as ReactNode);
  for (const key of ["aria-label", "title", "placeholder", "label", "hint"]) {
    if (typeof props[key] === "string") props[key] = translate(props[key] as string);
  }
  return cloneElement(node, props);
}

export function localize(node: ReactNode): ReactNode {
  return translateTree(node);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem("handbollsbanken-locale");
    return stored === "en" ? "en" : "sv";
  });
  currentLocale = locale;
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "sv" ? "Handbollsbanken — Träningsplanerare" : "Handbollsbanken — Training planner";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = locale === "sv"
      ? "Planera bättre handbollsträningar tillsammans."
      : "Plan better handball practices, together.";
    localStorage.setItem("handbollsbanken-locale", locale);
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageSelect() {
  const { locale, setLocale } = useLocale();
  return (
    <label className="language-select">
      <span className="sr-only">Language / Språk</span>
      <select aria-label="Language / Språk" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
        <option value="sv">Svenska</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
