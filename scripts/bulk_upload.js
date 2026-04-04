
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaqfJY61DzZ0Gd6F6ZZiAWHNJr1D9iq7w",
  authDomain: "scoreli-e5f98.firebaseapp.com",
  databaseURL: "https://scoreli-e5f98-default-rtdb.firebaseio.com",
  projectId: "scoreli-e5f98",
  storageBucket: "scoreli-e5f98.firebasestorage.app",
  messagingSenderId: "898947951152",
  appId: "1:898947951152:web:687fc1cb410daee1301bf5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const playersData = [
  {
    "name": "Pritam Chowdhury",
    "role": "Batsman",
    "team": "Local XI",
    "age": 19,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Medium",
    "careerRuns": 1200,
    "careerWickets": 15,
    "bio": "Consistent top-order batsman"
  },
  {
    "name": "Jojo",
    "role": "Bowler",
    "team": "Local XI",
    "age": 20,
    "height": "Unknown",
    "battingStyle": "Left-hand bat",
    "bowlingStyle": "Left-arm Fast",
    "careerRuns": 300,
    "careerWickets": 85,
    "bio": "Fast bowler with swing"
  },
  {
    "name": "Sayanik Roy",
    "role": "All-rounder",
    "team": "Local XI",
    "age": 21,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Off Spin",
    "careerRuns": 900,
    "careerWickets": 40,
    "bio": "Reliable all-rounder"
  },
  {
    "name": "Rohan",
    "role": "Batsman",
    "team": "Local XI",
    "age": 18,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "None",
    "careerRuns": 650,
    "careerWickets": 2,
    "bio": "Aggressive opener"
  },
  {
    "name": "Sneha Roy",
    "role": "All-rounder",
    "team": "Local XI",
    "age": 20,
    "height": "Unknown",
    "battingStyle": "Left-hand bat",
    "bowlingStyle": "Right-arm Medium",
    "careerRuns": 700,
    "careerWickets": 25,
    "bio": "Balanced performer"
  },
  {
    "name": "Nonta",
    "role": "Bowler",
    "team": "Local XI",
    "age": 22,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Fast",
    "careerRuns": 200,
    "careerWickets": 95,
    "bio": "Strike bowler"
  },
  {
    "name": "Sayan",
    "role": "Batsman",
    "team": "Local XI",
    "age": 19,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "None",
    "careerRuns": 500,
    "careerWickets": 0,
    "bio": "Middle-order batsman"
  },
  {
    "name": "Riju Mahajon",
    "role": "Bowler",
    "team": "Local XI",
    "age": 23,
    "height": "Unknown",
    "battingStyle": "Left-hand bat",
    "bowlingStyle": "Left-arm Orthodox",
    "careerRuns": 150,
    "careerWickets": 70,
    "bio": "Spin specialist"
  },
  {
    "name": "Riju",
    "role": "All-rounder",
    "team": "Local XI",
    "age": 21,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Medium",
    "careerRuns": 800,
    "careerWickets": 35,
    "bio": "Utility player"
  },
  {
    "name": "Kaku",
    "role": "Batsman",
    "team": "Local XI",
    "age": 24,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "None",
    "careerRuns": 1100,
    "careerWickets": 5,
    "bio": "Experienced batsman"
  },
  {
    "name": "Suronjit",
    "role": "Bowler",
    "team": "Local XI",
    "age": 22,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Fast",
    "careerRuns": 180,
    "careerWickets": 88,
    "bio": "Pace attack leader"
  },
  {
    "name": "Sojol",
    "role": "All-rounder",
    "team": "Local XI",
    "age": 20,
    "height": "Unknown",
    "battingStyle": "Left-hand bat",
    "bowlingStyle": "Left-arm Medium",
    "careerRuns": 750,
    "careerWickets": 30,
    "bio": "Versatile player"
  },
  {
    "name": "Niloy",
    "role": "Batsman",
    "team": "Local XI",
    "age": 19,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "None",
    "careerRuns": 400,
    "careerWickets": 1,
    "bio": "Young talent"
  },
  {
    "name": "Nishan",
    "role": "Bowler",
    "team": "Local XI",
    "age": 21,
    "height": "Unknown",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm Medium",
    "careerRuns": 220,
    "careerWickets": 60,
    "bio": "Consistent bowler"
  }
];

async function run() {
  console.log("Cleaning up previous Local XI data...");
  const teamSnap = await getDocs(query(collection(db, "teams"), where("name", "==", "Local XI")));

  if (!teamSnap.empty) {
    for (const teamDoc of teamSnap.docs) {
      const teamId = teamDoc.id;
      console.log(`Found existing team ${teamId}. Deleting players...`);
      const playersSnap = await getDocs(query(collection(db, "players"), where("team_id", "==", teamId)));
      const batch = writeBatch(db);
      playersSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`Deleted ${playersSnap.size} players. Deleting team...`);
      await deleteDoc(teamDoc.ref);
    }
  }

  console.log("Creating new team 'Local XI'...");
  const newTeam = await addDoc(collection(db, "teams"), {
    name: "Local XI",
    logo_url: null,
    createdAt: serverTimestamp()
  });
  const teamId = newTeam.id;
  console.log(`Created team with ID: ${teamId}`);

  for (const player of playersData) {
    await addDoc(collection(db, "players"), {
      name: player.name,
      role: player.role,
      team_id: teamId,
      photo_url: null,
      age: player.age,
      height: player.height,
      batting_style: player.battingStyle,
      bowling_style: player.bowlingStyle,
      career_runs: player.careerRuns,
      career_wickets: player.careerWickets,
      bio: player.bio,
      createdAt: serverTimestamp()
    });
    console.log(`Uploaded player: ${player.name}`);
  }

  console.log("Ready! All changes 'undone' and 'uploaded'.");
  process.exit(0);
}

run().catch(console.error);
