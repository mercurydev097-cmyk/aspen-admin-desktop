export type ProgramType = "adult" | "junior";

export interface Session {
  id: string;
  type: ProgramType;
  title: string;
  price: number;
  schedule: string;
  time: string;
  location: string;
  coach: string;
  description: string;
  sessionsIncluded?: number;
  /** Dated class fields, modelled on the live Momence schedule. */
  date?: string; // ISO yyyy-mm-dd, host timezone (Central)
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  level?: string;
  program?: string; // series label shown under the title
  tag?: string; // named drill / team, used for the Team filter
  status?: "open" | "cancelled" | "draft"; // draft = hidden from players
  capacity?: number;
  seriesId?: string; // groups weekly repeats so admin can edit the whole series
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  type: ProgramType;
  age?: number;
  initials: string;
  color: "navy" | "gold";
  enrolledSessionIds: string[];
}

export interface UpcomingBooking {
  id: string;
  sessionId: string;
  memberId: string;
  when: string;
}

const FALL = "Aspen Tennis Academy Fall Team Drills";
const WOMENS = "Aspen Tennis Academy Women\u2019s Fall Team Drills";
const FRIDAY_DESC =
  "This drill is for levels 3.0-3.5. Players are more consistent with a variety of strokes and can rally at a moderate pace. Focus is on shot placement, spin and footwork. Lessons will cover serve development, approach shots, volleys, overheads and point construction to assist players to transition to the next level.";
const WEDNESDAY_DESC =
  "This drill is for levels 2.5-3.0. Players are comfortable with the basic strokes and are ready to add more movements while hitting the ball (left/right and forward movements). Focus is on fun and challenging point plays. Serves are introduced as well as volleys and net play.";
const MIX_DESC =
  "This drill is for men and women of all levels, 3.5 and higher. This is an excellent drill for doubles strategy and competitive point play. Come enjoy a great evening workout.";
// Momence lists no description for most team drills, so none is invented here.
const TEAM_DESC = "";

const DAY_LABEL: Record<string, string> = {
  "2026-10-23": "Fri, Oct 23",
  "2026-10-26": "Mon, Oct 26",
  "2026-10-27": "Tue, Oct 27",
  "2026-10-28": "Wed, Oct 28",
  "2026-10-29": "Thu, Oct 29",
  "2026-10-30": "Fri, Oct 30",
};

function adultClass(
  id: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  durationMin: number,
  location: string,
  price: number,
  extra: Partial<Session> = {}
): Session {
  return {
    id,
    type: "adult",
    title,
    price,
    schedule: DAY_LABEL[date],
    time: `${startTime} - ${endTime}`,
    location,
    coach: "Ashlee Gardner",
    description: TEAM_DESC,
    date,
    startTime,
    endTime,
    durationMin,
    status: "open",
    sessionsIncluded: 1,
    ...extra,
  };
}

export const sessions: Session[] = [
  adultClass("drop-shot-divas-1023-cancelled", "Drop Shot Divas Team Drill", "2026-10-23", "8:30 AM", "10:00 AM", 90, "Arbor Park", 27, { program: FALL, tag: "Drop Shot Divas", status: "cancelled" }),
  adultClass("drop-shot-divas-1023", "Drop Shot Divas Team Drill", "2026-10-23", "8:30 AM", "10:00 AM", 90, "Arbor Park", 27, { program: FALL, tag: "Drop Shot Divas" }),
  adultClass("open-friday-1023-9", "Aspen Open Friday Drill", "2026-10-23", "9:00 AM", "10:00 AM", 60, "Arbor Park", 27, { description: FRIDAY_DESC, level: "3.0-3.5", tag: "Aspen Friday Open Drill" }),
  adultClass("causing-a-racket-1023", "Causing a Racket Team Drill", "2026-10-23", "10:00 AM", "11:30 AM", 90, "Arbor Park", 25, { program: "Aspen Tennis Academy Women\u2019s Fall Drills", tag: "CCR Causing a Racket" }),
  adultClass("open-friday-1023-10", "Aspen Open Friday Drill", "2026-10-23", "10:00 AM", "11:00 AM", 60, "Arbor Park", 27, { description: FRIDAY_DESC, level: "3.0-3.5", tag: "Aspen Friday Open Drill" }),

  adultClass("mix-drill-1026", "Aspen Men\u2019s & Women\u2019s Mix Drill", "2026-10-26", "7:00 PM", "8:00 PM", 60, "Aspen", 30, { description: MIX_DESC, level: "3.5 & higher" }),

  adultClass("sunrise-beauties-1027", "Sunrise Beauties Drill", "2026-10-27", "7:00 AM", "8:30 AM", 90, "Arbor Park", 35, { tag: "Sunrise Beauties Drill" }),
  adultClass("tuesday-champ-1027", "Tuesday Champ Team Drill", "2026-10-27", "8:30 AM", "9:30 AM", 60, "Arbor Park", 30, { program: FALL, tag: "Aspen Champ Drill" }),
  adultClass("queens-of-the-court-1027", "Queens of the Court", "2026-10-27", "8:30 AM", "9:30 AM", 60, "Arbor Park", 25, { program: WOMENS, tag: "Queens of the Court" }),
  adultClass("serve-it-dirty-1027", "Serve it Dirty Team Drill", "2026-10-27", "9:30 AM", "11:00 AM", 90, "Arbor Park", 27, { program: FALL }),
  adultClass("over-served-1027", "Over Served Team Drill", "2026-10-27", "9:30 AM", "11:00 AM", 90, "Aspen", 27, { program: FALL, tag: "Over Served" }),
  adultClass("simple-smash-1027", "Simple Smash Team Drill", "2026-10-27", "11:00 AM", "12:30 PM", 90, "Arbor Park", 27, { program: FALL, tag: "Simply Smash" }),

  adultClass("open-wednesday-1028", "Aspen Open Wednesday Evening Drill", "2026-10-28", "7:00 PM", "8:00 PM", 60, "Aspen", 30, { description: WEDNESDAY_DESC, level: "2.5-3.0", tag: "Aspen Open Wednesday Evening Drill" }),

  adultClass("glamour-slammers-1029", "Glamour Slammers & No Mercy Team Drill", "2026-10-29", "8:30 AM", "10:00 AM", 90, "Aspen", 25, { tag: "Glamour Slammers" }),
  adultClass("fireball-1029", "Fireball Team Drills", "2026-10-29", "10:00 AM", "11:30 AM", 90, "Aspen", 24, { program: WOMENS, tag: "Fireball" }),
  adultClass("rally-cats-1029", "Rally Cats", "2026-10-29", "10:00 AM", "11:00 AM", 60, "Aspen", 25, { program: FALL, tag: "Rally Cats" }),

  adultClass("drop-shot-divas-1030", "Drop Shot Divas Team Drill", "2026-10-30", "8:30 AM", "10:00 AM", 90, "Arbor Park", 27, { program: FALL, tag: "Drop Shot Divas" }),
  adultClass("open-friday-1030-9", "Aspen Open Friday Drill", "2026-10-30", "9:00 AM", "10:00 AM", 60, "Arbor Park", 27, { description: FRIDAY_DESC, level: "3.0-3.5", tag: "Aspen Friday Open Drill" }),
  adultClass("causing-a-racket-1030", "Causing a Racket Team Drill", "2026-10-30", "10:00 AM", "11:30 AM", 90, "Arbor Park", 25, { program: "Aspen Tennis Academy Women\u2019s Fall Drills", tag: "CCR Causing a Racket" }),
  adultClass("open-friday-1030-10", "Aspen Open Friday Drill", "2026-10-30", "10:00 AM", "11:00 AM", 60, "Arbor Park", 27, { description: FRIDAY_DESC, level: "3.0-3.5", tag: "Aspen Friday Open Drill" }),

  {
    id: "summer-camp-w5",
    type: "junior",
    title: "Summer Camp — Week 5",
    price: 220,
    schedule: "Mon – Fri",
    time: "9:00 AM – 12:00 PM",
    location: "Aspen Clubhouse",
    coach: "Coach Priya Nair",
    description:
      "A full week of drills, games, and match play for junior players, capped off with a Friday mini-tournament.",
  },
  {
    id: "private-lesson",
    type: "junior",
    title: "Private Lesson",
    price: 75,
    schedule: "Flexible booking",
    time: "45 minutes",
    location: "Any available court",
    coach: "Coach Priya Nair",
    description:
      "One-on-one coaching tailored to your junior player's level, scheduled whenever works for your family.",
  },
];

export const initialFamily: FamilyMember[] = [
  {
    id: "sarah",
    name: "Sarah Mitchell",
    relationship: "Parent",
    type: "adult",
    initials: "S",
    color: "navy",
    enrolledSessionIds: ["open-wednesday-1028"],
  },
  {
    id: "max",
    name: "Max Mitchell",
    relationship: "Son",
    type: "junior",
    age: 10,
    initials: "M",
    color: "gold",
    enrolledSessionIds: ["summer-camp-w5", "private-lesson"],
  },
];

export const initialUpcoming: UpcomingBooking[] = [
  { id: "u1", sessionId: "open-wednesday-1028", memberId: "sarah", when: "Wed, Oct 28 · 7:00 PM · Aspen" },
  { id: "u2", sessionId: "summer-camp-w5", memberId: "max", when: "Starts Mon · 9:00 AM · Aspen Clubhouse" },
];

export const currentUser = {
  name: "Sarah Mitchell",
  email: "sarah.mitchell@email.com",
  initials: "S",
};

export const savedCard = {
  brand: "Visa",
  last4: "4242",
  isDefault: true,
};

/** "Wed, Oct 28 · 7:00 PM · Aspen" for dated classes, plain schedule for programs. */
export function describeWhen(s: Session) {
  return s.date ? `${s.schedule} · ${s.startTime} · ${s.location}` : s.schedule;
}

export function formatLongDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export const adultLocations = Array.from(
  new Set(sessions.filter((s) => s.type === "adult").map((s) => s.location))
);

export const adultTags = Array.from(
  new Set(sessions.filter((s) => s.type === "adult" && s.tag).map((s) => s.tag as string))
).sort();

/** The academy details used on the About page (taken from the live Momence profile). */
export const academy = {
  name: "Aspen Tennis Academy",
  established: 2012,
  location: "Fulshear, Texas",
  awards: "Best of Fulshear 2023, 2024 and 2025",
  courts: ["Arbor Park", "Aspen"],
  leagues: ["USTA", "WHLTA", "HLTA"],
  about: [
    "Aspen Tennis Academy was established in 2012 by Ashlee B. Gardner. Ashlee has immense passion for the game of tennis and has been teaching tennis for 24 years. Ashlee\u2019s dedication and success as a student-athlete and a professional tennis coach has solidified her level of coaching. Her love for tennis and her passion for coaching are on display every time she steps onto the court.",
    "Aspen Tennis Academy has grown an amazing community in Fulshear over the last 11 years and has received The Best of Fulshear Award for 2023, 2024 and 2025. Aspen Tennis has Top Juniors and Adults in Texas competing at Aspen Tennis Academy. Our Women\u2019s and Men\u2019s programs have had many first place finishes multiple times in their divisions in the USTA, WHLTA and HLTA Leagues. Aspen Tennis Academy has also begun many players career path in tennis.",
    "Ashlee competed at the Division I level as a collegiate athlete. During her four-year career at Southern Utah University, Ashlee had a career record of 63-3 and received Most Valuable Player Award and lead as team captain.",
    "Coach Ashlee and her Coaching staff have a gift for teaching the strategy and positioning of doubles and will always give you immense encouragement and positivity as you learn and grow in your tennis game. Coach Ash feels so honored to be on court with each of her students.",
  ],
};
