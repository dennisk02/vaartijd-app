import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { shiftbaseGet } from "@/integrations/shiftbase/client";

/**
 * Importeert de River Roots-vaarbemanning uit Shiftbase (read-only) als
 * schepen, "vaarbemanning"-projecten, medewerkers en uren in Vaartijd.
 *
 * Elke Shiftbase-"department" komt overeen met precies één schip. Niet elke
 * department is daadwerkelijk een schip (bv. "Kantoor", "Quality") -- er is
 * geen betrouwbare naamregel om dat automatisch te herkennen, dus alle
 * departments worden wel gesynchroniseerd maar komen **inactief** binnen
 * (Ship.active = false); een beheerder activeert zelf de echte boten via het
 * bestaande schepen-beheerscherm. Hetzelfde geldt voor het bijbehorende
 * "Vaarbemanning <naam>"-project.
 *
 * Medewerkers krijgen een niet-inlogbaar Vaartijd-account (willekeurig
 * wachtwoord, active = false) puur om hun uren als TimeEntry te kunnen
 * vastleggen -- er wordt bewust geen gevoelige data (BSN, geboortedatum,
 * adres, loon) overgenomen, alleen naam + e-mailadres + het Shiftbase-ID.
 *
 * Performance: alles wordt eerst in bulk opgehaald en in Maps gezet, zodat
 * per Shiftbase-rij géén losse database-rondjes meer nodig zijn (een eerste
 * naieve opzet met een findUnique+upsert per rij liep bij ~270 medewerkers en
 * duizenden uren-regels vast op een onaanvaardbaar lange doorlooptijd).
 */

type ShiftbaseDepartment = { id: string | number; name: string };
type ShiftbaseUser = { id: string | number; first_name?: string; prefix?: string; last_name?: string; email?: string };
type ShiftbaseTimesheet = {
  id: string | number;
  user_id: string | number;
  date: string;
  starttime: string | null;
  endtime: string | null;
  total: string | number;
  break: string | number | null;
  status: string;
  deleted: boolean;
};
type ShiftbaseAbsenteeOption = { id: string | number; option: string; leave: boolean };
type ShiftbaseAbsentee = {
  id: string | number;
  user_id: string | number;
  absentee_option_id: string | number;
  startdate: string;
  enddate: string;
  hours_per_day: number | string;
  status: string;
  deleted: boolean;
};
type ShiftbaseRoster = {
  id: string | number;
  occurrence_id: string;
  department_id: string | number | null;
  user_id: string | number;
  date: string;
  starttime: string;
  endtime: string;
  total: string | number;
  published: boolean;
  deleted: boolean;
};

const VAARBEMANNING_PREFIX = "Vaarbemanning ";
const PLACEHOLDER_EMAIL_DOMAIN = "shiftbase.placeholder.vaartijd.internal";

function fullName(user: ShiftbaseUser) {
  return (
    [user.first_name, user.prefix, user.last_name]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(" ") || `Shiftbase-medewerker ${user.id}`
  );
}

/** Stap 1: elke Shiftbase-department -> een Ship + een bijbehorend Project. */
async function syncShipsAndProjects() {
  const response = (await shiftbaseGet("/departments")) as { data: { Department: ShiftbaseDepartment }[] };
  const departments = response.data.map((row) => ({ ...row.Department, id: String(row.Department.id) }));

  const [existingShipLinks, existingProjectLinks] = await Promise.all([
    prisma.shipShiftbaseLink.findMany({ select: { shiftbaseDepartmentId: true, shiftbaseDepartmentName: true, shipId: true } }),
    prisma.projectShiftbaseLink.findMany({ select: { shiftbaseDepartmentId: true } }),
  ]);
  const shipLinkByDept = new Map(existingShipLinks.map((s) => [s.shiftbaseDepartmentId, s]));
  const knownProjectDeptIds = new Set(existingProjectLinks.map((p) => p.shiftbaseDepartmentId));

  const shipsToCreate = departments.filter((d) => !shipLinkByDept.has(d.id));
  const shipsToUpdate = departments.filter((d) => {
    const existing = shipLinkByDept.get(d.id);
    return existing && existing.shiftbaseDepartmentName !== d.name;
  });
  const projectsToCreate = departments.filter((d) => !knownProjectDeptIds.has(d.id));

  // Ship en ShipShiftbaseLink zijn sinds 27 aug 2026 losse tabellen (§10.6) --
  // createMany kan niet in één keer over twee tabellen heen, dus per rij.
  // Schepen komen sinds 27 aug 2026 direct actief binnen (op klantverzoek --
  // eerder inactief zodat een beheerder niet-schip-departments als "Kantoor"/
  // "Quality" kon uitsluiten, maar dat handmatige controlestapje verviel).
  for (const d of shipsToCreate) {
    const ship = await prisma.ship.create({ data: { name: d.name, active: true } });
    await prisma.shipShiftbaseLink.create({
      data: { shipId: ship.id, shiftbaseDepartmentId: d.id, shiftbaseDepartmentName: d.name },
    });
  }
  for (const d of shipsToUpdate) {
    const link = shipLinkByDept.get(d.id)!;
    await prisma.ship.update({ where: { id: link.shipId }, data: { name: d.name } });
    await prisma.shipShiftbaseLink.update({
      where: { shiftbaseDepartmentId: d.id },
      data: { shiftbaseDepartmentName: d.name },
    });
  }
  for (const d of projectsToCreate) {
    const project = await prisma.project.create({
      data: { name: `${VAARBEMANNING_PREFIX}${d.name}`, active: false },
    });
    await prisma.projectShiftbaseLink.create({
      data: { projectId: project.id, shiftbaseDepartmentId: d.id },
    });
  }

  return departments.length;
}

/** Stap 2: elke Shiftbase-gebruiker -> een (niet-inlogbaar) Vaartijd-account. */
async function syncCrewUsers() {
  const response = (await shiftbaseGet("/users?limit=500")) as { data: { User: ShiftbaseUser }[] };
  const shiftbaseUsers = response.data.map((row) => ({ ...row.User, id: String(row.User.id) }));

  const [existingLinks, allEmails] = await Promise.all([
    prisma.userShiftbaseLink.findMany({ select: { userId: true, shiftbaseEmployeeId: true, user: { select: { name: true } } } }),
    prisma.user.findMany({ select: { email: true } }),
  ]);
  const linkByShiftbaseId = new Map(existingLinks.map((l) => [l.shiftbaseEmployeeId, l]));
  const takenEmails = new Set(allEmails.map((u) => u.email.toLowerCase()));

  const toCreate = shiftbaseUsers.filter((u) => !linkByShiftbaseId.has(u.id));
  const toUpdate = shiftbaseUsers.filter((u) => {
    const existing = linkByShiftbaseId.get(u.id);
    return existing && existing.user.name !== fullName(u);
  });

  if (toCreate.length > 0) {
    // Eén gedeelde, willekeurige hash voor de hele batch i.p.v. per account
    // opnieuw bcrypt draaien (10 rounds x 270+ accounts was de dominante
    // kostenpost van deze sync, ~50-70s). Geen van deze accounts kan
    // sowieso inloggen (active = false), dus een uniek wachtwoord per
    // account levert geen extra veiligheid op.
    const sharedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
    for (const u of toCreate) {
      const candidate = u.email?.trim().toLowerCase();
      const email =
        candidate && !takenEmails.has(candidate) ? u.email!.trim() : `shiftbase-${u.id}@${PLACEHOLDER_EMAIL_DOMAIN}`;
      takenEmails.add(email.toLowerCase());
      const user = await prisma.user.create({
        data: { name: fullName(u), email, passwordHash: sharedPasswordHash, active: false },
      });
      await prisma.userShiftbaseLink.create({ data: { userId: user.id, shiftbaseEmployeeId: u.id } });
    }
  }
  for (const u of toUpdate) {
    const link = linkByShiftbaseId.get(u.id)!;
    await prisma.user.update({ where: { id: link.userId }, data: { name: fullName(u) } });
  }

  return shiftbaseUsers.length;
}

/** Stap 3: uren in [minDate, maxDate] ophalen en als TimeEntry vastleggen.
 * Shiftbase geeft een HTTP 500 bij een te groot bereik in één aanroep
 * (bevestigd: 260 dagen faalt, de bestaande nachtelijke 35 dagen werkt al
 * jarenlang probleemloos) -- voor een terugvulling over meerdere maanden
 * moet dit dus in kleinere stukken aangeroepen worden, zie
 * backfillShiftbaseTimesheets hieronder. */
async function syncTimesheets(minDate: Date, maxDate: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const response = (await shiftbaseGet(`/timesheets?min_date=${fmt(minDate)}&max_date=${fmt(maxDate)}`)) as {
    data: {
      Timesheet: ShiftbaseTimesheet;
      Department?: { id: string | number; name: string } | null;
      Team?: { name: string } | null;
    }[];
  };

  const [shipLinks, projectLinks, userLinks, existingImports] = await Promise.all([
    prisma.shipShiftbaseLink.findMany({ select: { shipId: true, shiftbaseDepartmentId: true } }),
    prisma.projectShiftbaseLink.findMany({ select: { projectId: true, shiftbaseDepartmentId: true } }),
    prisma.userShiftbaseLink.findMany({ select: { userId: true, shiftbaseEmployeeId: true } }),
    prisma.timeEntryShiftbaseImport.findMany({
      select: { timesheetId: true, timeEntryId: true, timeEntry: { select: { hours: true, startTime: true, endTime: true } } },
    }),
  ]);
  const shipByDept = new Map(shipLinks.map((s) => [s.shiftbaseDepartmentId, s.shipId]));
  const projectByDept = new Map(projectLinks.map((p) => [p.shiftbaseDepartmentId, p.projectId]));
  const userByShiftbaseId = new Map(userLinks.map((u) => [u.shiftbaseEmployeeId, u.userId]));
  const existingByTimesheetId = new Map(
    existingImports.map((e) => [e.timesheetId, { timeEntryId: e.timeEntryId, ...e.timeEntry }])
  );

  let skippedNoShip = 0;
  let skippedNoUser = 0;
  let skippedNotApproved = 0;
  const toCreate: {
    shiftbaseTimesheetId: string;
    userId: string;
    projectId: string;
    shipId: string | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    breakMinutes: number;
    mode: "SHIFTBASE_IMPORT";
    hours: number;
    description: string | null;
  }[] = [];
  const toUpdate: { timeEntryId: string; hours: number; startTime: Date; endTime: Date; breakMinutes: number }[] = [];

  for (const row of response.data) {
    const entry = row.Timesheet;
    if (entry.deleted) continue;
    if (entry.status !== "Approved") {
      skippedNotApproved++;
      continue;
    }
    if (!entry.starttime || !entry.endtime) continue;

    const departmentId = row.Department ? String(row.Department.id) : null;
    const projectId = departmentId ? projectByDept.get(departmentId) : undefined;
    if (!projectId) {
      skippedNoShip++;
      continue;
    }
    const userId = userByShiftbaseId.get(String(entry.user_id));
    if (!userId) {
      skippedNoUser++;
      continue;
    }

    const startDateTime = new Date(`${entry.date}T${entry.starttime}`);
    let endDateTime = new Date(`${entry.date}T${entry.endtime}`);
    if (endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const timesheetId = String(entry.id);
    const hours = Math.round(Number(entry.total) * 100) / 100;
    const breakMinutes = entry.break ? Math.round(Number(entry.break)) : 0;

    const existing = existingByTimesheetId.get(timesheetId);
    if (existing) {
      const changed =
        Number(existing.hours) !== hours ||
        existing.startTime?.getTime() !== startDateTime.getTime() ||
        existing.endTime?.getTime() !== endDateTime.getTime();
      if (changed) toUpdate.push({ timeEntryId: existing.timeEntryId, hours, startTime: startDateTime, endTime: endDateTime, breakMinutes });
      continue;
    }

    toCreate.push({
      shiftbaseTimesheetId: timesheetId,
      userId,
      projectId,
      shipId: (departmentId && shipByDept.get(departmentId)) ?? null,
      date: new Date(entry.date),
      startTime: startDateTime,
      endTime: endDateTime,
      breakMinutes,
      mode: "SHIFTBASE_IMPORT",
      hours,
      description: row.Team?.name ?? null,
    });
  }

  // TimeEntry en TimeEntryShiftbaseImport zijn losse tabellen (§10.6) --
  // createMany kan niet over twee tabellen heen, dus per rij (zelfde patroon
  // als syncShipsAndProjects/syncCrewUsers hierboven).
  for (const t of toCreate) {
    const { shiftbaseTimesheetId, ...entryData } = t;
    // Ook geïmporteerde vaarbemanning-uren beginnen op PENDING richting AFAS
    // (crew-uren moeten net zo goed geboekt worden) -- zie §10.6.
    const entry = await prisma.timeEntry.create({ data: { ...entryData, afasLink: { create: {} } } });
    await prisma.timeEntryShiftbaseImport.create({ data: { timeEntryId: entry.id, timesheetId: shiftbaseTimesheetId } });
  }
  for (const u of toUpdate) {
    await prisma.timeEntry.update({
      where: { id: u.timeEntryId },
      data: { hours: u.hours, startTime: u.startTime, endTime: u.endTime, breakMinutes: u.breakMinutes },
    });
  }

  return {
    total: response.data.length,
    processed: toCreate.length + toUpdate.length,
    skippedNoShip,
    skippedNoUser,
    skippedNotApproved,
  };
}

/** Bovengrens op het aantal dagen dat één Shiftbase-afwezigheidsperiode
 * wordt uitgesplitst -- puur een vangnet tegen een corrupte/open-ended
 * bronrij (zie `open_ended` in de Shiftbase-respons) die anders duizenden
 * lege dagrijen zou opleveren. Een jaar+ aan verlof in één keer komt in de
 * praktijk niet voor. */
const MAX_ABSENCE_DAYS = 400;

/** Stap 4: ziekte/verlof in [minDate, maxDate] ophalen en per kalenderdag
 * vastleggen als AbsenceEntry (zie het schema-commentaar bij AbsenceEntry
 * voor waarom per dag i.p.v. per periode). `/absentee_options` levert de
 * naam + het `leave`-vlag per verloftype (false = ziekte-achtig) -- klein
 * genoeg om bij elke sync opnieuw op te halen i.p.v. apart te cachen.
 * Zelfde Approved/deleted-filter en bulk-opzet als syncTimesheets. */
async function syncAbsences(minDate: Date, maxDate: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [optionsResponse, absenteesResponse] = (await Promise.all([
    shiftbaseGet("/absentee_options"),
    shiftbaseGet(`/absentees?min_date=${fmt(minDate)}&max_date=${fmt(maxDate)}`),
  ])) as [{ data: { AbsenteeOption: ShiftbaseAbsenteeOption }[] }, { data: { Absentee: ShiftbaseAbsentee }[] }];

  const optionById = new Map(
    optionsResponse.data.map((row) => [
      String(row.AbsenteeOption.id),
      { label: row.AbsenteeOption.option, isSick: !row.AbsenteeOption.leave },
    ])
  );

  const [userLinks, existingEntries] = await Promise.all([
    prisma.userShiftbaseLink.findMany({ select: { userId: true, shiftbaseEmployeeId: true } }),
    prisma.absenceEntry.findMany({ select: { id: true, shiftbaseAbsenteeId: true, date: true, hours: true } }),
  ]);
  const userByShiftbaseId = new Map(userLinks.map((u) => [u.shiftbaseEmployeeId, u.userId]));
  const existingByKey = new Map(
    existingEntries.map((e) => [`${e.shiftbaseAbsenteeId}:${fmt(e.date)}`, e])
  );

  let skippedNoUser = 0;
  let skippedNotApproved = 0;
  let skippedTooLong = 0;
  const toCreate: {
    userId: string;
    date: Date;
    hours: number;
    isSick: boolean;
    optionLabel: string;
    shiftbaseAbsenteeId: string;
  }[] = [];
  const toUpdate: { id: string; hours: number }[] = [];

  for (const row of absenteesResponse.data) {
    const entry = row.Absentee;
    if (entry.deleted) continue;
    if (entry.status !== "Approved") {
      skippedNotApproved++;
      continue;
    }
    const userId = userByShiftbaseId.get(String(entry.user_id));
    if (!userId) {
      skippedNoUser++;
      continue;
    }

    const option = optionById.get(String(entry.absentee_option_id));
    const hours = Math.round(Number(entry.hours_per_day) * 100) / 100;
    const absenteeId = String(entry.id);

    const start = new Date(entry.startdate);
    const end = new Date(entry.enddate);
    const cursor = new Date(start);
    let daySeen = 0;
    while (cursor <= end) {
      daySeen++;
      if (daySeen > MAX_ABSENCE_DAYS) {
        skippedTooLong++;
        break;
      }
      const key = `${absenteeId}:${fmt(cursor)}`;
      const existing = existingByKey.get(key);
      if (existing) {
        if (Number(existing.hours) !== hours) toUpdate.push({ id: existing.id, hours });
      } else {
        toCreate.push({
          userId,
          date: new Date(cursor),
          hours,
          isSick: option?.isSick ?? false,
          optionLabel: option?.label ?? "Onbekend",
          shiftbaseAbsenteeId: absenteeId,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  if (toCreate.length > 0) await prisma.absenceEntry.createMany({ data: toCreate });
  for (const u of toUpdate) {
    await prisma.absenceEntry.update({ where: { id: u.id }, data: { hours: u.hours } });
  }

  return {
    total: absenteesResponse.data.length,
    processed: toCreate.length + toUpdate.length,
    skippedNoUser,
    skippedNotApproved,
    skippedTooLong,
  };
}

/** Stap 5: gepland rooster in [minDate, maxDate] ophalen en als RosterEntry
 * vastleggen -- om te vergelijken met de daadwerkelijk gewerkte uren
 * (TimeEntry). Shiftbase expandeert herhalende roosterdefinities zelf al
 * tot losse datums (`occurrence_id`) bij het opvragen met min_date/max_date,
 * dus dit is qua vorm identiek aan syncTimesheets. Alleen gepubliceerde
 * (`published: true`), niet-verwijderde regels tellen mee -- een concept-
 * rooster is nog geen "standaard rooster" om tegen af te zetten. */
async function syncRosters(minDate: Date, maxDate: Date) {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const response = (await shiftbaseGet(`/rosters?min_date=${fmt(minDate)}&max_date=${fmt(maxDate)}`)) as {
    data: { Roster: ShiftbaseRoster }[];
  };

  const [shipLinks, userLinks, existingEntries] = await Promise.all([
    prisma.shipShiftbaseLink.findMany({ select: { shipId: true, shiftbaseDepartmentId: true } }),
    prisma.userShiftbaseLink.findMany({ select: { userId: true, shiftbaseEmployeeId: true } }),
    prisma.rosterEntry.findMany({
      select: { id: true, shiftbaseOccurrenceId: true, hours: true, startTime: true, endTime: true },
    }),
  ]);
  const shipByDept = new Map(shipLinks.map((s) => [s.shiftbaseDepartmentId, s.shipId]));
  const userByShiftbaseId = new Map(userLinks.map((u) => [u.shiftbaseEmployeeId, u.userId]));
  const existingByOccurrence = new Map(existingEntries.map((r) => [r.shiftbaseOccurrenceId, r]));

  let skippedNoUser = 0;
  let skippedNotPublished = 0;
  const toCreate: {
    userId: string;
    shipId: string | null;
    date: Date;
    startTime: Date;
    endTime: Date;
    hours: number;
    shiftbaseOccurrenceId: string;
  }[] = [];
  const toUpdate: { id: string; hours: number; startTime: Date; endTime: Date }[] = [];

  for (const row of response.data) {
    const entry = row.Roster;
    if (entry.deleted) continue;
    if (!entry.published) {
      skippedNotPublished++;
      continue;
    }
    const userId = userByShiftbaseId.get(String(entry.user_id));
    if (!userId) {
      skippedNoUser++;
      continue;
    }

    const departmentId = entry.department_id ? String(entry.department_id) : null;
    const shipId = (departmentId && shipByDept.get(departmentId)) ?? null;

    const startDateTime = new Date(`${entry.date}T${entry.starttime}`);
    let endDateTime = new Date(`${entry.date}T${entry.endtime}`);
    if (endDateTime <= startDateTime) {
      // Zelfde correctie als syncTimesheets -- ook een placeholder-rooster
      // (bv. een "vrij"-dag met 00:00-00:00) valt hieronder; de daadwerkelijke
      // urenwaarde komt sowieso uit `entry.total`, niet uit dit tijdsverschil.
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const occurrenceId = entry.occurrence_id;
    const hours = Math.round(Number(entry.total) * 100) / 100;

    const existing = existingByOccurrence.get(occurrenceId);
    if (existing) {
      const changed =
        Number(existing.hours) !== hours ||
        existing.startTime.getTime() !== startDateTime.getTime() ||
        existing.endTime.getTime() !== endDateTime.getTime();
      if (changed) toUpdate.push({ id: existing.id, hours, startTime: startDateTime, endTime: endDateTime });
      continue;
    }

    toCreate.push({
      userId,
      shipId,
      date: new Date(entry.date),
      startTime: startDateTime,
      endTime: endDateTime,
      hours,
      shiftbaseOccurrenceId: occurrenceId,
    });
  }

  if (toCreate.length > 0) await prisma.rosterEntry.createMany({ data: toCreate });
  for (const u of toUpdate) {
    await prisma.rosterEntry.update({
      where: { id: u.id },
      data: { hours: u.hours, startTime: u.startTime, endTime: u.endTime },
    });
  }

  return {
    total: response.data.length,
    processed: toCreate.length + toUpdate.length,
    skippedNoUser,
    skippedNotPublished,
  };
}

export async function syncShiftbaseCrew(days = 35) {
  const departmentCount = await syncShipsAndProjects();
  const userCount = await syncCrewUsers();

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setUTCDate(minDate.getUTCDate() - days);
  const timesheetResult = await syncTimesheets(minDate, maxDate);
  const absenceResult = await syncAbsences(minDate, maxDate);
  const rosterResult = await syncRosters(minDate, maxDate);

  return {
    departments: departmentCount,
    users: userCount,
    timesheets: timesheetResult,
    absences: absenceResult,
    rosters: rosterResult,
  };
}

/**
 * Eenmalige terugvulling van historische uren/ziekte-verlof/rooster, verder
 * terug dan de nachtelijke sync (35 dagen) gaat -- vraagt Shiftbase op in
 * maandelijkse stukken (i.p.v. één aanroep over de hele periode) omdat een
 * te groot bereik in één keer een HTTP 500 geeft. Roept schepen/projecten/
 * medewerkers-sync bewust niet opnieuw aan (dat doet de nachtelijke sync
 * toch al) -- alleen de drie datasets hierboven, per maand.
 */
export async function backfillShiftbaseHistory(sinceDate: Date) {
  const results: {
    minDate: string;
    maxDate: string;
    timesheets: { total: number; processed: number };
    absences: { total: number; processed: number };
    rosters: { total: number; processed: number };
  }[] = [];
  const now = new Date();
  const cursor = new Date(sinceDate);

  while (cursor < now) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 30);
    const maxDate = chunkEnd > now ? now : chunkEnd;

    const [timesheets, absences, rosters] = await Promise.all([
      syncTimesheets(cursor, maxDate),
      syncAbsences(cursor, maxDate),
      syncRosters(cursor, maxDate),
    ]);
    results.push({
      minDate: cursor.toISOString().slice(0, 10),
      maxDate: maxDate.toISOString().slice(0, 10),
      timesheets: { total: timesheets.total, processed: timesheets.processed },
      absences: { total: absences.total, processed: absences.processed },
      rosters: { total: rosters.total, processed: rosters.processed },
    });

    cursor.setUTCDate(cursor.getUTCDate() + 30);
  }

  return results;
}
