export type AppLanguage = "NL" | "EN" | "UK" | "AR";

export interface Dictionary {
  appName: string;
  logout: string;
  manage: string;
  save: string;
  saving: string;
  none: string;
  date: string;

  navHome: string;
  navHours: string;
  navOccupancy: string;
  navMeals: string;
  navWaste: string;
  navHistory: string;

  greeting: string;
  today: string;
  hours: string;
  meals: string;
  waste: string;
  logForToday: string;
  notSubmittedYet: string;
  tasksDone: string;
  review: string;
  done: string;
  todo: string;
  onboardShort: string;

  tHours: string;
  timer: string;
  manual: string;
  elapsed: string;
  recording: string;
  tapStart: string;
  startShift: string;
  stopShift: string;
  resetTimer: string;
  project: string;
  chooseProject: string;
  searchProject: string;
  noProjectsFound: string;
  ship: string;
  chooseShip: string;
  start: string;
  end: string;
  break: string;
  min: string;
  totalWorked: string;
  saveHours: string;
  description: string;

  tOccupancy: string;
  dayPart: string;
  day: string;
  night: string;
  onboard: string;
  seats: string;
  ofCapacity: string;
  passengers: string;
  crew: string;
  saveOccupancy: string;

  tMeals: string;
  mealsSub: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  servedToday: string;
  totalToday: string;
  saveMeals: string;

  tWaste: string;
  wasteNote: string;
  kg: string;
  foodUsed: string;
  passengerWaste: string;
  kitchenWaste: string;
  prepWaste: string;
  addPrepWaste: string;
  saveWaste: string;

  tHistory: string;
  week: string;
  month: string;
  weekTotal: string;
  open: string;
  submitted: string;
  noEntries: string;

  tSubmit: string;
  summaryFor: string;
  edit: string;
  confirmNote: string;
  submitDay: string;
  alreadySubmitted: string;
  noHoursWarning: string;
  logHoursFirst: string;
  submitWithoutHours: string;

  loginSub: string;
  email: string;
  password: string;
  signin: string;
}

const nl: Dictionary = {
  appName: "Vaartijd",
  logout: "Uitloggen",
  manage: "Beheer",
  save: "Opslaan",
  saving: "Bezig...",
  none: "Geen",
  date: "Datum",

  navHome: "Home",
  navHours: "Werkuren",
  navOccupancy: "Bezetting",
  navMeals: "Maaltijden",
  navWaste: "Voedselverspilling",
  navHistory: "Geschiedenis",

  greeting: "Goedemorgen",
  today: "Vandaag",
  hours: "Uren",
  meals: "Maaltijden",
  waste: "Afval",
  logForToday: "Registreren vandaag",
  notSubmittedYet: "Nog niet ingediend",
  tasksDone: "{done} van {total} taken klaar",
  review: "Controleren",
  done: "Klaar",
  todo: "Te doen",
  onboardShort: "aan boord",

  tHours: "Werkuren",
  timer: "Timer",
  manual: "Handmatig",
  elapsed: "Tijd op dienst",
  recording: "Bezig -- tik op stop als je klaar bent",
  tapStart: "Tik op start als je dienst begint",
  startShift: "Dienst starten",
  stopShift: "Dienst stoppen",
  resetTimer: "Timer wissen",
  project: "Project",
  chooseProject: "Kies een project",
  searchProject: "Zoek op naam of nummer...",
  noProjectsFound: "Geen projecten gevonden.",
  ship: "Schip",
  chooseShip: "Kies een schip",
  start: "Start",
  end: "Eind",
  break: "Pauze",
  min: "min",
  totalWorked: "Totaal gewerkt",
  saveHours: "Uren opslaan",
  description: "Notitie (optioneel)",

  tOccupancy: "Bezetting",
  dayPart: "Dagdeel",
  day: "Dag",
  night: "Nacht",
  onboard: "Aan boord",
  seats: "plaatsen",
  ofCapacity: "van capaciteit",
  passengers: "Passagiers",
  crew: "Bemanning",
  saveOccupancy: "Bezetting opslaan",

  tMeals: "Maaltijden",
  mealsSub: "Aantal geserveerde maaltijden per dienst",
  breakfast: "Ontbijt",
  lunch: "Lunch",
  dinner: "Diner",
  servedToday: "vandaag geserveerd",
  totalToday: "Totaal vandaag",
  saveMeals: "Maaltijden opslaan",

  tWaste: "Voedselverspilling",
  wasteNote: "Weeg de voedselbak na elke dienst en vul de kilogrammen in.",
  kg: "kg",
  foodUsed: "Voedsel gebruikt",
  passengerWaste: "Passagiersafval",
  kitchenWaste: "Keukenafval",
  prepWaste: "Bereidingsafval",
  addPrepWaste: "+ Bereidingsafval toevoegen",
  saveWaste: "Afval opslaan",

  tHistory: "Geschiedenis",
  week: "Deze week",
  month: "Deze maand",
  weekTotal: "Weektotaal",
  open: "Open",
  submitted: "Ingediend",
  noEntries: "Geen registraties in deze periode.",

  tSubmit: "Controleren & indienen",
  summaryFor: "Overzicht",
  edit: "Wijzig",
  confirmNote: "Ik bevestig dat bovenstaande gegevens voor deze dag kloppen.",
  submitDay: "Dag indienen",
  noHoursWarning: "Je hebt nog geen uren geregistreerd voor vandaag.",
  logHoursFirst: "Eerst uren registreren",
  submitWithoutHours: "Toch indienen zonder uren",
  alreadySubmitted: "Deze dag is al ingediend.",

  loginSub: "Log in met je account",
  email: "E-mailadres",
  password: "Wachtwoord",
  signin: "Inloggen",
};

const en: Dictionary = {
  appName: "Vaartijd",
  logout: "Log out",
  manage: "Manage",
  save: "Save",
  saving: "Working...",
  none: "None",
  date: "Date",

  navHome: "Home",
  navHours: "Working hours",
  navOccupancy: "Occupancy",
  navMeals: "Meals",
  navWaste: "Food waste",
  navHistory: "History",

  greeting: "Good morning",
  today: "Today",
  hours: "Hours",
  meals: "Meals",
  waste: "Waste",
  logForToday: "Log for today",
  notSubmittedYet: "Not submitted yet",
  tasksDone: "{done} of {total} tasks done",
  review: "Review",
  done: "Done",
  todo: "To do",
  onboardShort: "on board",

  tHours: "Working hours",
  timer: "Timer",
  manual: "Manual",
  elapsed: "Time on shift",
  recording: "Recording -- tap stop when done",
  tapStart: "Tap start when your shift begins",
  startShift: "Start shift",
  stopShift: "Stop shift",
  resetTimer: "Reset timer",
  project: "Project",
  chooseProject: "Choose a project",
  searchProject: "Search by name or number...",
  noProjectsFound: "No projects found.",
  ship: "Ship",
  chooseShip: "Choose a ship",
  start: "Start",
  end: "End",
  break: "Break",
  min: "min",
  totalWorked: "Total worked",
  saveHours: "Save hours",
  description: "Note (optional)",

  tOccupancy: "Occupancy",
  dayPart: "Day part",
  day: "Day",
  night: "Night",
  onboard: "On board",
  seats: "seats",
  ofCapacity: "of capacity",
  passengers: "Passengers",
  crew: "Crew",
  saveOccupancy: "Save occupancy",

  tMeals: "Meals",
  mealsSub: "Meals served per service today",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  servedToday: "served today",
  totalToday: "Total today",
  saveMeals: "Save meals",

  tWaste: "Food waste",
  wasteNote: "Weigh the food bin after each service and enter the kilograms.",
  kg: "kg",
  foodUsed: "Food used",
  passengerWaste: "Passenger waste",
  kitchenWaste: "Kitchen waste",
  prepWaste: "Preparation waste",
  addPrepWaste: "+ Add preparation waste",
  saveWaste: "Save waste",

  tHistory: "History",
  week: "This week",
  month: "This month",
  weekTotal: "Week total",
  open: "Open",
  submitted: "Submitted",
  noEntries: "No entries in this period.",

  tSubmit: "Review & submit",
  summaryFor: "Summary",
  edit: "Edit",
  confirmNote: "I confirm the entries above are correct for this day.",
  submitDay: "Submit day",
  noHoursWarning: "You haven't logged any hours for today yet.",
  logHoursFirst: "Log hours first",
  submitWithoutHours: "Submit anyway without hours",
  alreadySubmitted: "This day has already been submitted.",

  loginSub: "Log in with your account",
  email: "Email address",
  password: "Password",
  signin: "Sign in",
};

const uk: Dictionary = {
  appName: "Vaartijd",
  logout: "Вийти",
  manage: "Керування",
  save: "Зберегти",
  saving: "Обробка...",
  none: "Немає",
  date: "Дата",

  navHome: "Головна",
  navHours: "Робочі години",
  navOccupancy: "Заповнюваність",
  navMeals: "Харчування",
  navWaste: "Харчові відходи",
  navHistory: "Історія",

  greeting: "Доброго ранку",
  today: "Сьогодні",
  hours: "Години",
  meals: "Харчування",
  waste: "Відходи",
  logForToday: "Реєстрація на сьогодні",
  notSubmittedYet: "Ще не подано",
  tasksDone: "{done} з {total} завдань виконано",
  review: "Перевірити",
  done: "Готово",
  todo: "Ще потрібно",
  onboardShort: "на борту",

  tHours: "Робочі години",
  timer: "Таймер",
  manual: "Вручну",
  elapsed: "Час на зміні",
  recording: "Запис -- натисніть стоп, коли закінчите",
  tapStart: "Натисніть старт, коли зміна почнеться",
  startShift: "Почати зміну",
  stopShift: "Завершити зміну",
  resetTimer: "Скинути таймер",
  project: "Проєкт",
  chooseProject: "Виберіть проєкт",
  searchProject: "Пошук за назвою чи номером...",
  noProjectsFound: "Проєктів не знайдено.",
  ship: "Судно",
  chooseShip: "Виберіть судно",
  start: "Початок",
  end: "Кінець",
  break: "Перерва",
  min: "хв",
  totalWorked: "Всього відпрацьовано",
  saveHours: "Зберегти години",
  description: "Примітка (необов'язково)",

  tOccupancy: "Заповнюваність",
  dayPart: "Частина доби",
  day: "День",
  night: "Ніч",
  onboard: "На борту",
  seats: "місць",
  ofCapacity: "від місткості",
  passengers: "Пасажири",
  crew: "Екіпаж",
  saveOccupancy: "Зберегти заповнюваність",

  tMeals: "Харчування",
  mealsSub: "Кількість поданих страв за прийом їжі",
  breakfast: "Сніданок",
  lunch: "Обід",
  dinner: "Вечеря",
  servedToday: "подано сьогодні",
  totalToday: "Всього сьогодні",
  saveMeals: "Зберегти харчування",

  tWaste: "Харчові відходи",
  wasteNote: "Зважте контейнер з відходами після кожного прийому їжі та введіть кілограми.",
  kg: "кг",
  foodUsed: "Використано їжі",
  passengerWaste: "Відходи пасажирів",
  kitchenWaste: "Кухонні відходи",
  prepWaste: "Відходи приготування",
  addPrepWaste: "+ Додати відходи приготування",
  saveWaste: "Зберегти відходи",

  tHistory: "Історія",
  week: "Цього тижня",
  month: "Цього місяця",
  weekTotal: "Всього за тиждень",
  open: "Відкрито",
  submitted: "Подано",
  noEntries: "Немає записів за цей період.",

  tSubmit: "Перевірити та подати",
  summaryFor: "Огляд",
  edit: "Змінити",
  confirmNote: "Я підтверджую, що вищезазначені дані за цей день правильні.",
  submitDay: "Подати день",
  noHoursWarning: "Ви ще не зареєстрували годин на сьогодні.",
  logHoursFirst: "Спочатку зареєструвати години",
  submitWithoutHours: "Все одно подати без годин",
  alreadySubmitted: "Цей день вже подано.",

  loginSub: "Увійдіть у свій обліковий запис",
  email: "Електронна пошта",
  password: "Пароль",
  signin: "Увійти",
};

const ar: Dictionary = {
  appName: "Vaartijd",
  logout: "تسجيل الخروج",
  manage: "الإدارة",
  save: "حفظ",
  saving: "جارٍ الحفظ...",
  none: "لا شيء",
  date: "التاريخ",

  navHome: "الرئيسية",
  navHours: "ساعات العمل",
  navOccupancy: "عدد الركاب",
  navMeals: "الوجبات",
  navWaste: "هدر الطعام",
  navHistory: "السجل",

  greeting: "صباح الخير",
  today: "اليوم",
  hours: "الساعات",
  meals: "الوجبات",
  waste: "الهدر",
  logForToday: "تسجيل اليوم",
  notSubmittedYet: "لم يتم الإرسال بعد",
  tasksDone: "تم إنجاز {done} من أصل {total} مهام",
  review: "مراجعة",
  done: "تم",
  todo: "لم يتم بعد",
  onboardShort: "على متن السفينة",

  tHours: "ساعات العمل",
  timer: "المؤقّت",
  manual: "يدوي",
  elapsed: "وقت المناوبة",
  recording: "جارٍ التسجيل -- اضغط إيقاف عند الانتهاء",
  tapStart: "اضغط بدء عند بدء مناوبتك",
  startShift: "بدء المناوبة",
  stopShift: "إنهاء المناوبة",
  resetTimer: "إعادة ضبط المؤقّت",
  project: "المشروع",
  chooseProject: "اختر مشروعًا",
  searchProject: "ابحث بالاسم أو الرقم...",
  noProjectsFound: "لم يتم العثور على مشاريع.",
  ship: "السفينة",
  chooseShip: "اختر سفينة",
  start: "البداية",
  end: "النهاية",
  break: "الاستراحة",
  min: "دقيقة",
  totalWorked: "إجمالي ساعات العمل",
  saveHours: "حفظ الساعات",
  description: "ملاحظة (اختياري)",

  tOccupancy: "عدد الركاب",
  dayPart: "فترة اليوم",
  day: "نهار",
  night: "ليل",
  onboard: "على متن السفينة",
  seats: "مقعدًا",
  ofCapacity: "من السعة",
  passengers: "الركاب",
  crew: "الطاقم",
  saveOccupancy: "حفظ عدد الركاب",

  tMeals: "الوجبات",
  mealsSub: "عدد الوجبات المقدَّمة لكل وجبة",
  breakfast: "الإفطار",
  lunch: "الغداء",
  dinner: "العشاء",
  servedToday: "قُدِّمت اليوم",
  totalToday: "الإجمالي اليوم",
  saveMeals: "حفظ الوجبات",

  tWaste: "هدر الطعام",
  wasteNote: "زِن حاوية الطعام بعد كل وجبة وأدخل عدد الكيلوغرامات.",
  kg: "كغ",
  foodUsed: "الطعام المستخدم",
  passengerWaste: "هدر الركاب",
  kitchenWaste: "هدر المطبخ",
  prepWaste: "هدر التحضير",
  addPrepWaste: "+ إضافة هدر التحضير",
  saveWaste: "حفظ الهدر",

  tHistory: "السجل",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  weekTotal: "إجمالي الأسبوع",
  open: "مفتوح",
  submitted: "تم الإرسال",
  noEntries: "لا توجد تسجيلات في هذه الفترة.",

  tSubmit: "مراجعة وإرسال",
  summaryFor: "ملخص",
  edit: "تعديل",
  confirmNote: "أؤكد أن البيانات أعلاه صحيحة لهذا اليوم.",
  submitDay: "إرسال اليوم",
  noHoursWarning: "لم تسجّل أي ساعات لهذا اليوم بعد.",
  logHoursFirst: "سجّل الساعات أولاً",
  submitWithoutHours: "إرسال على أي حال بدون ساعات",
  alreadySubmitted: "تم إرسال هذا اليوم بالفعل.",

  loginSub: "سجّل الدخول إلى حسابك",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  signin: "تسجيل الدخول",
};

export const dictionaries: Record<AppLanguage, Dictionary> = { NL: nl, EN: en, UK: uk, AR: ar };

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language];
}

export function tFormat(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

const locales: Record<AppLanguage, string> = {
  NL: "nl-NL",
  EN: "en-US",
  UK: "uk-UA",
  AR: "ar",
};

export function localeFor(language: AppLanguage) {
  return locales[language];
}

export function dirFor(language: AppLanguage): "ltr" | "rtl" {
  return language === "AR" ? "rtl" : "ltr";
}

const htmlLangCodes: Record<AppLanguage, string> = {
  NL: "nl",
  EN: "en",
  UK: "uk",
  AR: "ar",
};

export function htmlLangFor(language: AppLanguage) {
  return htmlLangCodes[language];
}
