// import { PuzzleDefinition } from '../types/puzzle';

// // ============================================
// // KLOTSKI: RED DONKEY (HUARONG DAO)
// // ============================================
// // The most famous configuration.
// // Layout:
// // V B B V
// // V B B V
// // V H H V
// // V S S V
// // S     S
// export const KLOTSKI_RED_DONKEY: PuzzleDefinition = {
//     puzzle_id: "klotski-red-donkey",
//     title: "Klotski: Red Donkey",
//     description: "The classic configuration (Huarong Dao). Help Cao Cao (Red Block) escape through the bottom exit!",
//     viewMode: "2D_TOP_DOWN",
//     board: {
//         dimensions: { width: 4, height: 5, depth: 1 },
//         initial_state: [
//             // Red 2x2 goal block - Top Center
//             { id: "cao-cao", cells: [[1, 0], [2, 0], [1, 1], [2, 1]], color: "#D01012" },

//             // Vertical Generals
//             { id: "v1", cells: [[0, 0], [0, 1]], color: "#0055BF" }, // Top Left
//             { id: "v2", cells: [[3, 0], [3, 1]], color: "#0055BF" }, // Top Right
//             { id: "v3", cells: [[0, 2], [0, 3]], color: "#0055BF" }, // Mid Left
//             { id: "v4", cells: [[3, 2], [3, 3]], color: "#0055BF" }, // Mid Right

//             // Horizontal General (Guan Yu)
//             { id: "h1", cells: [[1, 2], [2, 2]], color: "#0055BF" },

//             // Soldiers (Small Squares)
//             // Standard easy variation often puts them differently, but this is the 'Frontal' or 'Classic' setup
//             // Usually S at (1,3), (2,3), (0,4), (3,4) leaving (1,4) and (2,4) empty
//             // BUT Wait, v3 occupies (0,2)-(0,3). v4 occupies (3,2)-(3,3).
//             // So row 3 is: v3(0,3), S(1,3), S(2,3), v4(3,3).
//             { id: "s1", cells: [[1, 3]], color: "#F5C300" },
//             { id: "s2", cells: [[2, 3]], color: "#F5C300" },

//             // Bottom Row: S(0,4), S(3,4). Empty in middle (1,4), (2,4)
//             { id: "s3", cells: [[0, 4]], color: "#F5C300" },
//             { id: "s4", cells: [[3, 4]], color: "#F5C300" },
//         ]
//     },
//     inventory: [],
//     goal: {
//         targetPieceId: "cao-cao",
//         cells: [[1, 3], [2, 3], [1, 4], [2, 4]], // Bottom center
//     },
//     validation_rules: [
//         { type: "GOAL", rule: "GOAL_REACHED" },
//         { type: "MOVEMENT", rule: "SLIDING_ONLY" },
//         { type: "ROTATION", rule: "NO_ROTATION" },
//         { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
//         { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
//     ],
//     metadata: {
//         author: "Traditional",
//         difficulty: "expert",
//         tags: ["slider", "2D", "klotski", "classic"]
//     }
// };

// // ============================================
// // KLOTSKI: DAUGHTER IN THE BOX (HAKOIRI MUSUME)
// // ============================================
// // Another classic variation.
// // Layout:
// // B B V V
// // B B V V
// // H H S S 
// // S S H H
// // S     S (Roughly)
// // Actually "Daughter in the Box" usually refers to the specific physical puzzle which is often just Huarong Dao.
// // Let's implement "Three Generals" or "Trail" for variety.

// // Let's do "Sunshine" (often easier)
// // V B B V
// // V B B V
// // S H H S
// // V     V
// // S     S  <-- This layout seems unstable.

// // Let's do a purely logical one: "Crossway"
// export const KLOTSKI_CROSSWAY: PuzzleDefinition = {
//     puzzle_id: "klotski-crossway",
//     title: "Klotski: Crossway",
//     description: "A tricky variation. Navigate the crossway of blocks.",
//     viewMode: "2D_TOP_DOWN",
//     board: {
//         dimensions: { width: 4, height: 5, depth: 1 },
//         initial_state: [
//             // Big block
//             { id: "b1", cells: [[1, 0], [2, 0], [1, 1], [2, 1]], color: "#D01012" },

//             // Top corners vertical
//             { id: "v1", cells: [[0, 0], [0, 1]], color: "#0055BF" },
//             { id: "v2", cells: [[3, 0], [3, 1]], color: "#0055BF" },

//             // Middle row: H H
//             { id: "h1", cells: [[0, 2], [1, 2]], color: "#0055BF" },
//             { id: "h2", cells: [[2, 2], [3, 2]], color: "#0055BF" },

//             // Row 3: S S S S
//             { id: "s1", cells: [[0, 3]], color: "#F5C300" },
//             { id: "s2", cells: [[1, 3]], color: "#F5C300" },
//             { id: "s3", cells: [[2, 3]], color: "#F5C300" },
//             { id: "s4", cells: [[3, 3]], color: "#F5C300" },

//             // Bottom: Empty row or similar?
//             // Wait, we need 18 cells filled.
//             // Filled: 4(B) + 4(V) + 4(H) + 4(S) = 16. Need 2 more.
//             // Let's add 2 verticals at bottom corners?
//             // H1, H2 take up row 2 fully.
//             // Row 3: 4 smalls.
//             // Row 4: Empty.
//             // Total: 4+4+4+4 = 16.
//             // Puzzle needs 18 filled normally to be hard? Not necessarily.
//             // But if we have 4 empty spaces it might be too easy.
//             // Let's add 2 more smalls.
//             { id: "s5", cells: [[0, 4]], color: "#F5C300" },
//             { id: "s6", cells: [[3, 4]], color: "#F5C300" }
//         ]
//     },
//     inventory: [],
//     goal: {
//         targetPieceId: "b1",
//         cells: [[1, 3], [2, 3], [1, 4], [2, 4]],
//     },
//     validation_rules: [
//         { type: "GOAL", rule: "GOAL_REACHED" },
//         { type: "MOVEMENT", rule: "SLIDING_ONLY" },
//         { type: "ROTATION", rule: "NO_ROTATION" },
//         { type: "PLACEMENT", rule: "NO_BRICK_OVERLAP" },
//         { type: "PLACEMENT", rule: "NO_BRICKS_OUT_OF_BOUNDS" }
//     ],
//     metadata: {
//         author: "Variant",
//         difficulty: "medium",
//         tags: ["slider", "2D", "klotski"]
//     }
// };
