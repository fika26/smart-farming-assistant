/* ==========================================================
   TECHNOVATION — THE FIVE REALMS · site content
   Edit THIS file to update the site. Nothing else needs changing.
   Empty string "" = "Coming soon" is shown automatically.
   ========================================================== */

window.TV = {
  fest: {
    name: "TECHNOVATION",
    edition: "’26",
    theme: "The Five Realms",
    dept: "Department of Mechanical (Mechatronics) Engineering",
    college: "Mahatma Gandhi Institute of Technology",
    collegeShort: "MGIT",
    place: "Gandipet, Hyderabad",
    dates: "16 & 17 October 2026",
    // Countdown target (IST). TODO: 9:15 AM is NOT confirmed yet. Update startsAt + startLabel when the schedule is final.
    startsAt: "2026-10-16T09:15:00+05:30",
    startLabel: "Friday, 16 October · 9:15 AM IST",
    // After this the countdown switches to a thank-you message (end of Day 2 by default).
    endsAt: "2026-10-17T23:59:59+05:30",
    blurb:
      "The Mechatronics department’s celebration of robotics, automation and engineering ideas at MGIT, with technical competitions, workshops and fun non-technical events."
  },

  // Google Form links. Paste a link to switch the button from "Opens soon" to live.
  forms: {
    // One registration form for every event.
    register: "https://docs.google.com/forms/d/e/1FAIpQLSc50uuUAK36DzXbY0cdRy7YY8bs5-WMuWkWH0fcAZRBa-R45Q/viewform",
    volunteer: "" // MGIT student volunteers (separate form)
  },

  // Optional: drop a file at assets/audio/theme.mp3 to replace the generated soundtrack.
  soundtrackFile: "assets/audio/theme.mp3",

  about: {
    mgit:
      "An autonomous engineering college in Gandipet, Hyderabad, established in 1997 by the Chaitanya Bharathi Educational Society. Affiliated to JNTU Hyderabad, MGIT holds an A++ grade from NAAC, and its eligible UG programmes are NBA accredited.",
    dept:
      "Mechatronics combines mechanical design, electronics, embedded control and software to build intelligent machines such as robots, drones and automation systems. Our department hosts Technovation.",
    stats: [
      { v: "1997", k: "Year established" },
      { v: "A++", k: "NAAC grade" },
      { v: "11", k: "UG engineering programmes" },
      { v: "~4,000", k: "Students on campus" }
    ],
    vision: "To inspire curiosity in robotics, automation and cross-disciplinary engineering.",
    mission: "To give students one platform to learn, build and compete with real machines.",
    values: "Teamwork, integrity, curiosity and a strong hands-on work ethic.",
    impact: "Turning classroom ideas into working prototypes and building confidence."
  },

  pillars: [
    { k: "Compete", d: "Robotics, drones, rovers, trivia and more, across two days." },
    { k: "Learn", d: "Pick up new skills at the hands-on robotics workshop." },
    { k: "Showcase", d: "Present your projects, papers and posters to a live audience." },
    { k: "Connect", d: "Meet and team up with students from other campuses." }
  ],

  // Fest-wide roadmap. date "" => Coming soon
  festRoadmap: [
    { t: "Registrations open", d: "Open now", note: "One form for every event. Scan the QR or use the Register button." },
    { t: "Registrations close", d: "", note: "" },
    { t: "Day 1 · The Gates Open", d: "16 Oct 2026", note: "MGIT, Gandipet" },
    { t: "Day 2 · The Final Trials", d: "17 Oct 2026", note: "MGIT, Gandipet" },
    { t: "Results & honours", d: "", note: "" }
  ],

  realms: [
    {
      id: "earth", name: "Earth", sanskrit: "Prithvi", pillar: "Mechanical",
      epithet: "Realm of Iron and Stone",
      line: "Structure, mass and motion. Chassis, gears and the machines that hold their ground.",
      color: "#c08a4a", glyph: "earth"
    },
    {
      id: "fire", name: "Fire", sanskrit: "Agni", pillar: "Electrical & Electronics",
      epithet: "Realm of the Living Spark",
      line: "Energy and power. Circuits, current and the spark that brings a machine to life.",
      color: "#ef6a33", glyph: "fire"
    },
    {
      id: "water", name: "Water", sanskrit: "Jala", pillar: "Control Systems",
      epithet: "Realm of the Returning Tide",
      line: "Feedback and balance. Like water finding its level, a controller always returns to its set point.",
      color: "#3aa7b4", glyph: "water"
    },
    {
      id: "air", name: "Air", sanskrit: "Vayu", pillar: "Sensors & Actuators",
      epithet: "Realm of the Unseen Touch",
      line: "Perception and response. Sensors that feel the world and actuators that move through it.",
      color: "#a9c8de", glyph: "air"
    },
    {
      id: "ether", name: "Ether", sanskrit: "Akasha", pillar: "Software & Intelligence",
      epithet: "Realm of the Silent Code",
      line: "The invisible medium that holds everything. Code, logic, ideas and the knowledge behind every build.",
      color: "#9a7cf0", glyph: "ether"
    }
  ],

  /* Trials (events). All events are paid.
     form: leave "" to use forms.register (one form for every event).
     time: date & time shown on the card/page. days: which fest days it runs (for the Chronicle).
     poster: official poster at assets/posters/<id>.webp. partner: club or company shown on the page.
     road: roadmap steps. rules: rulebook sections. scoring / penalties / glance: tables.
     rules: null => no rulebook (non-technical). */
  trials: [
    { id: "rugged-rovers", realm: "earth", type: "Technical", name: "Rugged Rovers", icon: "rover", poster: true,
      tagline: "Tile, sand, gravel, soil. Conquer every surface.",
      desc: "Drive your rover across a course of alternating surfaces, ramps, bumps and potholes. Clear every checkpoint in order, fast and in control.",
      fee: "₹300 per team", prize: "Win exciting prizes", venue: "Opposite B-Block (on soil)", time: "16 & 17 Oct · 11 AM onwards", days: [16, 17], team: "1 to 4 members", form: "",
      coords: [{ name: "Satya Ganesh Prasad Dubey", phone: "+91 90632 85308" }, { name: "Gogineni Saurya", phone: "+91 95930 44444" }],
      road: [
        { t: "Register", p: "Sign up your team through the registration form." },
        { t: "Report to the arena", p: "Opposite B-Block, on soil, from 11 AM. Bring your rover fully built." },
        { t: "Run the course", p: "Cross every surface zone in order and pass every checkpoint, within 10 minutes." },
        { t: "Results", p: "Best run time plus penalties. Lowest score wins." }
      ],
      glance: { title: "Rover limits", rows: [["Max size (L × W × H)", "40 × 40 × 40 cm"], ["Max weight (with battery)", "5 kg"], ["Max voltage", "24 V, onboard batteries only"], ["Time limit", "10 min per run"]] },
      rules: [
        { h: "Rover specifications", items: [
          "Maximum size 40 cm × 40 cm × 40 cm (L × W × H), and maximum weight 5 kg including the battery.",
          "Onboard batteries only, maximum 24 V. No AC power.",
          "Any sensors are allowed (IR, colour, camera, ultrasonic, LiDAR and so on). DC, servo or stepper motors are allowed.",
          "Remote control and external communication are allowed.",
          "Not allowed: liquids, powders or substances that mark or damage the track, flying mechanisms, and anything that leaves debris.",
          "The rover must have a clearly visible power switch or emergency stop.",
          "The rover must display your team name or number clearly."
        ] },
        { h: "The track", items: [
          "The track has alternating surfaces, which may include smooth tile, concrete, wood, metal, carpet, grass, sand, gravel, soil and rubber.",
          "Expect straights, curves, ramps and slopes, speed bumps, potholes, narrow paths, surface transitions and start/finish zones.",
          "Track boundaries are clearly marked. The course is outdoors, in sunlight.",
          "Teams may not mark or damage the track."
        ] },
        { h: "Run procedure", items: [
          "Place the rover behind the start line. The timer starts when it crosses the start line and stops when its front crosses the finish line.",
          "Time limit: 10 minutes per run. If the rover doesn’t finish, the run ends.",
          "The rover must cross all surface zones in the required order, and pass through or over every checkpoint.",
          "You may skip the stretch between one checkpoint and the next, with a 12-second penalty.",
          "If the rover is stuck, you can ask for a recovery: it’s placed at the last checkpoint with a 10-second penalty. Allowed up to 3 times per run.",
          "If the rover leaves the track, it may be placed at the last checkpoint with a 10-second penalty. Allowed up to 3 times per run.",
          "Touching the rover during a run costs 10 seconds. A second touch means disqualification.",
          "The rover must stop inside the finish zone. If it keeps going, that’s a 5-second penalty."
        ] },
        { h: "Scoring", items: [
          "Your score is your best run time plus penalties. The lowest score wins.",
          "Tiebreakers, in order: fewer penalties, fastest single lap or segment, then a re-run.",
          "Rovers that don’t finish are ranked by distance covered, then by time."
        ] },
        { h: "Safety & conduct", items: [
          "No flames, smoke or hazardous chemicals. Organizers may stop any run for safety reasons.",
          "Respect the organizers, coordinators, volunteers and other teams. No sabotage or interference with other rovers. Good sportsmanship is required.",
          "Verbal abuse or harassment means immediate disqualification.",
          "Keep the track clean. Anything left on the track, or any damage after your run, leads to disqualification."
        ] },
        { h: "Appeals & rule changes", items: [
          "Appeals must be made within 2 minutes after the run, and only for rule misinterpretation, not judgment calls. The coordinator’s decision is final.",
          "Organizers may change the rules, track or schedule. Changes are announced before the event or before the affected round.",
          "By registering, all participants agree to follow these rules."
        ] }
      ],
      penalties: [["Human touch", "+10 s"], ["Off course (placed back)", "+10 s"], ["Stuck (recovered)", "+10 s"], ["Missing a checkpoint", "+10 s"], ["Skipping between checkpoints", "+12 s"], ["Not stopping in the finish zone", "+5 s"], ["Damaging the track", "Disqualified"], ["Unsafe behaviour", "Disqualified"], ["Cheating or tampering", "Disqualified"]] },

    { id: "tug-of-war", realm: "earth", type: "Non-technical", name: "Tug of War", icon: "rope", poster: true,
      desc: "Two teams, one rope. Pull your rivals across the line.",
      fee: "₹200 per team", prize: "Win exciting prizes", venue: "In front of B-Block", time: "16 & 17 Oct · 11 AM onwards", days: [16, 17], team: "2 to 4 members", form: "",
      coords: [{ name: "Shaik Tauheed Pasha", phone: "+91 76740 24786" }, { name: "Mohammed Khaja Abbasuddin", phone: "+91 87900 39934" }],
      road: [
        { t: "Register your team", p: "Sign up through the registration form." },
        { t: "Report in front of B-Block", p: "From 11 AM. The coordinators explain the format on the spot." },
        { t: "Pull", p: "Head-to-head rounds. Drag the other team across the line." },
        { t: "Winners", p: "The last team standing takes it." }
      ], rules: null },

    { id: "robotics-workshop", realm: "fire", type: "Technical", name: "Robotics Workshop", icon: "workshop", poster: true, partner: "With the Robotics Club",
      theme: "Basics of PLC Programming and Simulation",
      desc: "A hands-on workshop on the basics of PLC programming and simulation, the way automation is built in real industry.",
      fee: "₹100 per person", prize: "", venue: "B-106, B-107", time: "17 Oct", days: [17], team: "Individual", form: "",
      coords: [{ name: "C Sai Sandeep", phone: "+91 99893 02620" }, { name: "Mohammed Junaid Qureshi", phone: "+91 63033 48622" }, { name: "Adarsh Bommidi", phone: "+91 94406 98391" }],
      road: [
        { t: "Register", p: "Sign up through the registration form. The workshop has its own fee, listed on the form." },
        { t: "Install the software", p: "The software to install beforehand will be shared on the WhatsApp group. Bring your laptop." },
        { t: "Report to B-106 / B-107", p: "On 17 Oct. Find your seat in the workshop hall." },
        { t: "Program & simulate", p: "Learn PLC basics, write your first programs and test them in simulation, guided step by step." }
      ], rules: [] },
    { id: "project-expo", realm: "fire", type: "Exhibition", name: "Project Expo", icon: "expo", poster: true,
      desc: "An exhibition of student-built mechatronic systems showing creativity, technical skill and interdisciplinary engineering. Projects focus on automation, robotics, smart systems and industry-relevant solutions.",
      fee: "₹100 per project", prize: "", venue: "In front of B-Block", time: "16 & 17 Oct · 10:30 AM", days: [16, 17], team: "", form: "",
      coords: [{ name: "Mohammed Zaid", phone: "+91 93928 97622" }, { name: "Aditi Gunne", phone: "+91 99895 84193" }, { name: "Yash Dubey", phone: "+91 99488 50695" }],
      road: [
        { t: "Register your project", p: "Sign up through the registration form." },
        { t: "Set up in front of B-Block", p: "From 10:30 AM on 16 & 17 Oct." },
        { t: "Show what you built", p: "Demo your working project to visitors and talk them through it." }
      ], rules: null },
    { id: "cramp-simulator", realm: "fire", type: "Non-technical", name: "Cramp Simulator", icon: "pulse", poster: true,
      tagline: "Experience it. Reflect it. Talk about it.",
      desc: "Experience period cramps first-hand to build awareness and empathy.",
      fee: "₹100 per head", prize: "", venue: "In front of B-Block", time: "16 & 17 Oct · 11 AM onwards", days: [16, 17], team: "", form: "",
      coords: [{ name: "Murali Krishna Sai", phone: "+91 85003 56317" }, { name: "K. Pavanateja", phone: "+91 63020 46280" }],
      road: [
        { t: "Register", p: "Sign up through the registration form." },
        { t: "Visit the stall", p: "In front of B-Block, from 11 AM." },
        { t: "Experience it", p: "Feel it for yourself, then reflect and talk about it." }
      ], rules: null },

    { id: "line-quest", realm: "water", type: "Technical", name: "Line Quest", icon: "linequest", poster: true,
      tagline: "Where lines define the fastest minds.",
      desc: "Build an autonomous robot that follows the line through curves, dashed lines, 90° turns, intersections and gaps. Fastest clean run wins.",
      fee: "₹300 per team", prize: "Win exciting prizes", venue: "B-407", time: "", days: [], team: "1 to 4 members", form: "",
      coords: [{ name: "M. Akshith Kumar", phone: "+91 81064 78312" }, { name: "Advith Hruday", phone: "+91 81258 77990" }],
      road: [
        { t: "Register", p: "Sign up your team through the registration form." },
        { t: "Report to B-407", p: "Bring your robot fully built." },
        { t: "Inspection", p: "Every robot must pass a safety and specification check." },
        { t: "Qualifying round", p: "Two official runs. Your best time counts." },
        { t: "Results", p: "Best run time plus penalties. Lowest score wins." }
      ],
      glance: { title: "Robot limits", rows: [["Max size (L × W × H)", "30 × 30 × 30 cm"], ["Max weight (with battery)", "3 kg"], ["Max voltage", "12 V, onboard batteries only"], ["Microcontrollers", "1"], ["Official runs", "2, best counts"], ["Time limit", "10 min per run"]] },
      rules: [
        { h: "Robot specifications", items: [
          "Maximum size 30 cm × 30 cm × 30 cm (L × W × H), and maximum weight 3 kg including the battery.",
          "Onboard batteries only, maximum 12 V. No AC power.",
          "Any sensors are allowed (IR, colour, camera, ultrasonic and so on). DC, servo or stepper motors are allowed.",
          "Only one microcontroller is allowed.",
          "Fully autonomous. No remote control, Bluetooth, Wi-Fi or any external communication during a run.",
          "Not allowed: rails, magnets or physical guides that follow the line; liquids, powders or substances that mark or damage the track; flying, jumping or hovering mechanisms.",
          "The robot must have a clearly visible power switch or emergency stop.",
          "The robot must display your team name or number clearly."
        ] },
        { h: "The track", items: [
          "The track may include straight sections, curves and dashed lines, 90° turns, intersections, gaps of up to 50 mm, start/finish zones and obscured lines (red lines).",
          "At intersections, the robot must go straight unless track markings say otherwise.",
          "Teams may not modify or mark the track."
        ] },
        { h: "Competition format", items: [
          "Inspection: every robot must pass a safety and specification check before competing.",
          "Qualifying round: each team gets 2 official runs. The best time counts.",
          "Place the robot behind the start line. It starts autonomously. The timer starts when it crosses the start line and stops when its front crosses the finish line.",
          "Time limit: 10 minutes per run. If the robot doesn’t finish, the run ends.",
          "If the robot loses the line but finds it again on its own within 5 seconds, the run continues.",
          "If the robot leaves the track, it may be placed at the last checkpoint with a 10-second penalty. Allowed up to 3 times per run.",
          "Touching the robot during a run costs 10 seconds. A second touch means disqualification.",
          "The robot must stop inside the finish zone. If it keeps going, that’s a 5-second penalty."
        ] },
        { h: "Scoring", items: [
          "Your score is your best run time plus penalties. The lowest score wins.",
          "Tiebreakers, in order: fewer penalties, fastest single lap, then a re-run.",
          "Robots that don’t finish are ranked by distance covered, then by time."
        ] },
        { h: "Safety & conduct", items: [
          "The emergency stop must be easy to reach. No flames, smoke or hazardous chemicals. Organizers may stop any run for safety reasons.",
          "Respect the organizers, coordinators, volunteers and other teams. No sabotage or interference with other robots. Good sportsmanship is required.",
          "Verbal abuse or harassment means immediate disqualification.",
          "Keep the track clean. Anything left on the track, or any damage after your run, leads to disqualification."
        ] },
        { h: "Appeals & rule changes", items: [
          "Appeals must be made within 2 minutes after the run, and only for rule misinterpretation, not judgment calls. The coordinator’s decision is final.",
          "Organizers may change the rules, track or schedule. Changes are announced before the event or before the affected round.",
          "By registering, all participants agree to follow these rules."
        ] }
      ],
      penalties: [["Human touch", "+10 s"], ["Off track (placed back)", "+10 s"], ["Missing a checkpoint", "+10 s"], ["Not stopping in the finish zone", "+5 s"], ["Damaging the track", "Disqualified"], ["External communication", "Disqualified"], ["Unsafe behaviour", "Disqualified"], ["Cheating or tampering", "Disqualified"]] },
    { id: "robothon", realm: "water", type: "Technical", name: "Robothon", icon: "robothon", poster: true,
      tagline: "A robotics ideathon to present your ideas.",
      desc: "A two-day robotics ideathon. Pick one of 26 real-world problem statements, or bring your own idea, and present it as a concept, design, simulation or working prototype. A working prototype greatly improves your chances of winning.",
      fee: "₹250 per team", prize: "Win exciting prizes", venue: "B-001, B-005", time: "16 & 17 Oct · 9 AM – 4 PM", days: [16, 17], team: "Solo or 2 to 4 members", form: "", problems: true,
      coords: [{ name: "Gundoju Manitej", phone: "+91 94909 79067" }, { name: "Arram Snehal", phone: "+91 94944 80714" }, { name: "B. Nakshiketh", phone: "+91 90326 45607" }],
      flow: [
        { day: "Day 1 · 16 Oct", steps: ["Register and check in at B-001 / B-005 with your college ID", "Choose a problem statement, or go open innovation", "Start building your idea, design, simulation or prototype", "Work stops at 4 PM. Head home and come back at 9 AM"] },
        { day: "Day 2 · 17 Oct", steps: ["Resume at 9 AM and keep building", "Submit your project details and presentation", "Present to the judges", "Results"] }
      ],
      rules: [
        { h: "Who can take part", items: [
          "Open to students from all colleges. Take part solo or in a team of 2 to 4.",
          "Register with correct details and carry your college ID.",
          "Follow the instructions of the event coordinators at all times."
        ] },
        { h: "Your project", items: [
          "Pick one of the problem statements on this page, or go open innovation with your own robotics idea.",
          "Projects can use robotics, automation, embedded systems, AI or related technologies.",
          "You can present an idea, design, simulation or working prototype. A fully working robot isn’t compulsory, but the idea must be practical and you must be able to explain how it works.",
          "A working prototype greatly improves your chances of winning.",
          "Original work only. Copying another team’s project or presenting someone else’s work isn’t allowed.",
          "Open-source and AI tools are allowed. Acknowledge external work where needed."
        ] },
        { h: "Submission", items: [
          "Work on your project across the two days.",
          "Submit your project title, problem statement, proposed solution, technologies used and expected applications, plus your presentation.",
          "Add circuit diagrams, CAD designs, source code, simulations or a prototype demo where relevant.",
          "Late submissions may not be accepted without the organizers’ permission."
        ] },
        { h: "Hardware & safety", items: [
          "Bring your own laptop, components, sensors and controllers. Limited shared resources may be available.",
          "Handle batteries, wiring and moving parts carefully. Damaged batteries and exposed wires aren’t allowed.",
          "Weapons, projectiles, explosives and anything that could harm people or property are strictly prohibited.",
          "Test robots only in the areas provided, and stop when an organizer asks you to.",
          "Report any damage to borrowed equipment, and don’t use another team’s equipment without permission."
        ] },
        { h: "Venue", items: [
          "Work runs 9 AM to 4 PM on both days. No overnight stay or overnight work at the venue.",
          "You’re responsible for your own belongings. Keep your workspace clean and dispose of e-waste properly.",
          "You can take part in other fest events too, as long as it doesn’t affect your Robothon submission."
        ] },
        { h: "Disqualification", items: [
          "Copying or cheating, false information or someone else’s work.",
          "Damaging another team’s project or equipment, or breaking safety rules.",
          "Misbehaving with participants, judges, volunteers or organizers, or repeatedly ignoring instructions."
        ] }
      ],
      scoring: { title: "Judging (100 marks)", rows: [["Innovation & originality", 25], ["Technical feasibility", 20], ["Practical application", 20], ["Design & implementation", 15], ["Presentation & demonstration", 10], ["Technical knowledge & answers to judges", 10]],
        note: "Ideas, designs and simulations are judged on the same criteria. A physical prototype isn’t compulsory." } },

    { id: "rotorz-liftoff", realm: "air", type: "Technical", name: "Rotorz Liftoff", icon: "drone", poster: true, partner: "With Euphostraaa Systems",
      tagline: "Drone building & flying, in 3 steps.",
      desc: "Build a drone part by part, learn how every part makes it fly, then take it off the ground. Compete at beginner, intermediate or advanced level.",
      fee: "Beginner ₹200 · Intermediate ₹150 · Advanced ₹100", prize: "Exciting prize money", venue: "Retreat", time: "16 Oct (Fri) · 11 AM onwards", days: [16], team: "Solo (1 member)", form: "",
      coords: [{ name: "P Varun Kumar", phone: "+91 78423 76100" }, { name: "K. Risheb", phone: "+91 83609 72913" }],
      road: [
        { t: "Register", p: "Sign up through the registration form and pick your level. Limited seats, so register early." },
        { t: "Build", p: "Put a drone together, part by part." },
        { t: "Learn", p: "How every part makes it fly." },
        { t: "Fly", p: "Take it off the ground at the Retreat." }
      ], rules: [] },

    { id: "paper", realm: "ether", type: "Technical", name: "Paper Presentation", icon: "scroll", poster: true,
      theme: "Mechatronics 2050: Build the Impossible",
      desc: "Theme: Mechatronics 2050: Build the Impossible. Imagine the machines of 2050, then make the case for how we get there. Present your original idea or research to a panel of judges.",
      fee: "₹200 per team", prize: "Win exciting prizes", venue: "B-403", time: "16 & 17 Oct", days: [16, 17], team: "1 to 4 members", form: "",
      coords: [{ name: "Amancharla Naga Manjusha", phone: "+91 80747 97698" }],
      road: [
        { t: "Register", p: "Sign up your team through the registration form." },
        { t: "Submit your abstract & slides", p: "Deadlines will be announced. You can also bring slides on a pen drive, with a backup." },
        { t: "Report to the event desk", p: "Arrive before your slot at B-403." },
        { t: "Present & face the judges", p: "A timed talk with slides, then Q&A." },
        { t: "Results", p: "Announced at Technovation." }
      ],
      rules: [
        { h: "Registration", items: [
          "Carry a valid college ID at all times.",
          "Registration is complete only after the fee is paid and confirmed. Fees are non-refundable unless the organizers cancel the event.",
          "Each person can be in only one team, and each team presents one paper. Team members can’t be changed after registration closes."
        ] },
        { h: "Topic & submission", items: [
          "Your paper must fit the theme: Mechatronics 2050: Build the Impossible.",
          "Abstract and slide submission details and deadlines will be announced. You can also bring your slides on a pen drive, with a backup copy.",
          "Original work only. Plagiarism or AI-generated text without attribution leads to rejection or disqualification.",
          "Cite all your sources. A references slide is mandatory."
        ] },
        { h: "Presentation", items: [
          "An oral presentation with slides, to an audience and a panel of judges, followed by Q&A. Time limits will be announced.",
          "The timer is strict. You get a warning before time runs out, and you’re stopped at the limit.",
          "Tell it as a story: problem, background, method, results, conclusion.",
          "Slides in PPT, PPTX or PDF. Videos and animations are fine if they work offline and fit the time.",
          "Don’t read your slides aloud. Slides support the speaker. Presentations are in English."
        ] },
        { h: "On the day", items: [
          "Report to the event desk before your slot. If you’re not there when called, you lose the slot.",
          "Slides are loaded onto the common system before the session. Personal laptops only with the organizers’ approval.",
          "A projector, podium and mic are provided. Anything else, bring yourself."
        ] },
        { h: "Fair play", items: [
          "You may be disqualified for plagiarism, fabricated data, misleading the judges, disrupting other presentations, ignoring instructions or abusive behaviour.",
          "Raise scoring queries with the coordinators before results are announced. The judges’ decision is final."
        ] }
      ],
      scoring: { title: "Judging (100 marks)", rows: [["Originality & innovation", 20], ["Technical depth & accuracy", 25], ["Structure & clarity", 15], ["Delivery & communication", 15], ["Quality of slides", 10], ["Q&A: answers & understanding", 15]],
        note: "Each judge scores independently and the final score is the average. Ties go to the higher Q&A score." } },
    { id: "poster", realm: "ether", type: "Technical", name: "Poster Presentation", icon: "poster", poster: true,
      theme: "Tech for Humanity",
      desc: "Theme: Tech for Humanity. Make one striking, hand-made poster on technology that changes lives in healthcare, accessibility or social good, then defend it to the judges.",
      fee: "₹200 per team", prize: "Win exciting prizes", venue: "B-403", time: "16 & 17 Oct", days: [16, 17], team: "1 to 4 members", form: "",
      coords: [{ name: "Lakshmi Manogna", phone: "+91 81068 62715" }],
      road: [
        { t: "Register", p: "Sign up your team through the registration form." },
        { t: "Make your poster at the venue", p: "Hand-made, on the canvas we provide, within a set time." },
        { t: "Open session", p: "Judges and visitors walk by. Explain your idea and answer questions." },
        { t: "Results", p: "Announced at Technovation." }
      ],
      rules: [
        { h: "Registration", items: [
          "Carry a valid college ID at all times.",
          "Registration is complete only after the fee is paid and confirmed. Fees are non-refundable unless the organizers cancel the event.",
          "Each person can be in only one team, and each team makes one poster. Team members can’t be changed after registration closes."
        ] },
        { h: "Theme & making the poster", items: [
          "Your poster must fit the theme: Tech for Humanity, covering healthcare, accessibility and social good.",
          "Posters are made at the venue, on the canvas we provide, within a set time. Posters on any other surface aren’t accepted.",
          "Hand-made and original only. No printouts, pasted prints or pre-made material. Hand-drawn diagrams and sketches are encouraged.",
          "No phones, laptops or internet while making the poster.",
          "Write the title and theme clearly at the top.",
          "Don’t put your name, college or any personal detail on the poster. You’ll get a poster number, so judging stays fair.",
          "Write in English, large enough to read from a distance. When time is called, posters are displayed as they stand."
        ] },
        { h: "Display & open session", items: [
          "Posters go up on boards in the hall. Mounting material is provided.",
          "There’s no speaking slot. Judges and visitors walk around and talk to you at your poster. Be ready to explain your idea in a couple of minutes.",
          "At least one team member must stay with the poster throughout. Unattended posters aren’t scored.",
          "Don’t touch, move or criticise other posters, and don’t take yours down until the organizers announce the end."
        ] },
        { h: "Fair play", items: [
          "You may be disqualified for copied or pre-made posters, work by someone outside the team, personal details on the poster, damaging posters or property, misleading the judges, ignoring instructions or abusive behaviour.",
          "Raise scoring queries with the coordinators before results are announced. The judges’ decision is final."
        ] }
      ],
      scoring: { title: "Judging (100 marks)", rows: [["Content & technical accuracy", 25], ["Originality & creativity", 20], ["Visual layout & clarity", 20], ["Neatness & effort", 10], ["Presentation & communication", 15], ["Handling of questions", 10]],
        note: "A poster that’s mostly dense paragraphs loses layout marks. Ties go to the higher content score." } },
    { id: "guess-the-gaana", realm: "ether", type: "Non-technical", name: "Guess the Gaana", icon: "music", poster: true, partner: "With Symphony",
      desc: "Name the song before time runs out. Play solo, as a duo or as a squad.",
      fee: "Single ₹40 · Duo ₹60 · Squad ₹80", prize: "Win exciting prizes", venue: "In front of B-Block", time: "16 & 17 Oct · 11 AM onwards", days: [16, 17], team: "Solo, duo or squad", form: "",
      coords: [{ name: "Haasitha Putti", phone: "+91 99662 59359" }, { name: "C. N. S. Gargi", phone: "+91 98665 01106" }],
      road: [
        { t: "Register", p: "Solo, duo or squad, through the registration form." },
        { t: "Report in front of B-Block", p: "From 11 AM. The coordinators explain the format on the spot." },
        { t: "Name that tune", p: "Hear it, guess it, beat the clock." },
        { t: "Winners", p: "Top scorers win." }
      ], rules: null },
    { id: "tollywood-trivia", realm: "ether", type: "Non-technical", name: "Tollywood Trivia", icon: "clapper", poster: true, partner: "With Spotlight",
      desc: "Rapid-fire rounds of Telugu cinema trivia. Prove you know your Tollywood.",
      fee: "₹100 per team", prize: "Win exciting prizes", venue: "In front of B-Block", time: "", days: [], team: "1 to 4 members", form: "",
      coords: [{ name: "P. K. V. N. Sarath Subramanyam", phone: "+91 83677 45678" }, { name: "Mathangi Sai Aman", phone: "+91 85559 00159" }],
      road: [
        { t: "Register", p: "Teams of 1 to 4, through the registration form." },
        { t: "Report in front of B-Block", p: "The coordinators explain the format on the spot." },
        { t: "Rapid-fire rounds", p: "Films, dialogues, songs and stars." },
        { t: "Winners", p: "Top team takes it." }
      ], rules: null }
  ],

  // Contact page, one array per row.
  contacts: [
    [
      { role: "HOD & Convener", name: "Prof. S Madhava Reddy", phone: "" },
      { role: "Faculty Coordinator", name: "Dr. K. V. Kasi Viswanadham", phone: "+91 92467 57582" },
      { role: "Faculty Co-Coordinator", name: "P Shashidhar", phone: "+91 70958 43401" }
    ],
    [
      { role: "Student Convenor", name: "K Navdeep", phone: "+91 79818 71998" },
      { role: "Student Convenor", name: "BVS Saranya", phone: "+91 90144 75127" },
      { role: "Student Co-Convenor", name: "C. N. S. Gargi", phone: "+91 98665 01106" },
      { role: "Student Co-Convenor", name: "P Varun Kumar", phone: "+91 78423 76100" }
    ],
    [
      { role: "Sponsorship Lead", name: "Ganesh Dubey", phone: "+91 90632 85308" }
    ]
  ],
  // General rules for all participants (shown on the Rules page)
  generalRules: [
    { h: "Timings", items: [
      "Both days run from 9 AM to 4 PM: Friday 16 and Saturday 17 October.",
      "Report at 9 AM at the registration desk in front of B Block. Find it on the campus map.",
      "Day 1 ends at 4 PM and everyone heads home. Day 2 starts again at 9 AM.",
      "Robothon teams stop at 4 PM on the 16th and continue at 9 AM on the 17th."
    ] },
    { h: "Registration & entry", items: [
      "Register online through the registration form, or on the spot on either day.",
      "A college ID card is compulsory for students from other colleges.",
      "Fees are non-refundable.",
      "You can register for more than one event. Take part in one, then move on to the next. You don’t have to stay until an event ends.",
      "Once you register, you’re added to the participants’ WhatsApp group. All updates are shared there."
    ] },
    { h: "Food, travel & stay", items: [
      "Lunch is free on both days for registered participants.",
      "MGIT buses are free for participants. Bus routes are shared on the WhatsApp group, so pick the bus nearest you.",
      "Buses leave campus at 4:10 PM.",
      "Parking is available if you come in your own vehicle.",
      "Accommodation is not provided."
    ] },
    { h: "What to bring", items: [
      "Your college ID card.",
      "For technical events: your own batteries, tools, components, IoT sensors and laptop.",
      "Power sockets are provided. Wi-Fi is not provided.",
      "There is no dress code."
    ] },
    { h: "Conduct", items: [
      "Smoking and alcohol are strictly prohibited on campus.",
      "Follow the instructions of the event coordinators and volunteers.",
      "The decisions of the organisers and judges are final.",
      "The schedule may change. Any updates will be shared on the WhatsApp group."
    ] },
    { h: "Certificates", items: [
      "Winners receive merit certificates."
    ] }
  ],
  // Registration desk (for all events)
  registrationTeam: [
    { name: "M Druthi Chowdary", phone: "+91 91211 43127" },
    { name: "Madhulika V", phone: "+91 94401 49701" },
    { name: "V Bhavani", phone: "+91 93463 83172" },
    { name: "K Sai Pranav", phone: "+91 83284 52523" }
  ],
  email: "technovation@mgit.ac.in",
  // Campus map (assets/campus-map.webp). Venue groups shown on the Map page.
  mapVenues: [
    { n: 4, place: "Retreat", events: ["rotorz-liftoff"] },
    { n: 5, place: "B Block", events: ["robothon", "robotics-workshop", "paper", "poster", "line-quest"] },
    { n: 5, place: "In front of B-Block", events: ["project-expo", "guess-the-gaana", "tollywood-trivia", "cramp-simulator", "tug-of-war"] },
    { n: 5, place: "Opposite B-Block (on soil)", events: ["rugged-rovers"] }
  ],
  address: "Department of Mechanical (Mechatronics) Engineering, Mahatma Gandhi Institute of Technology, Gandipet, Hyderabad – 500075, Telangana",
  website: "https://mgit.ac.in",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Mahatma+Gandhi+Institute+of+Technology+Gandipet+Hyderabad",

  // Fill when finalised.
  sponsors: [],   // e.g. { name: "Acme", tier: "Gold", logo: "assets/sponsors/acme.png", url: "" }
  socials: []     // e.g. { name: "Instagram", url: "https://instagram.com/..." }
};
