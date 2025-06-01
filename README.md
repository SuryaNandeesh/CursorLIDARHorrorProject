# LIDAR Horror Game

A first-person horror game where players navigate through a forest of steel poles using a LIDAR scanner to detect their surroundings and avoid a pursuing monster. Your goal is to find your way to your ship at the edge of the steel forest.

## 🎮 Game Features

### First-Person Perspective
- Mouse-controlled camera movement with smooth rotation
- Immersive gameplay from the player's viewpoint
- Movement relative to camera direction
- Pointer lock for better control

### LIDAR Scanning System
- Press SPACE to initiate a 360-degree scan
- 5-second cooldown between scans
- Color-coded scanning results:
  - Green lines: Steel poles
  - Red lines: Monster
  - Cyan lines: Walls
  - Yellow lines: Escape ship
- Visual feedback for scan progress and cooldown
- Scanning takes 2 seconds to complete

### Dynamic Monster AI
- Monster spawns after 60 seconds of player movement
- Pursues player at a slower speed
- Visible through LIDAR scanner with distinct red signature
- Can navigate around walls and obstacles
- Intelligent pathfinding to reach the player

### Complex Environment
- Dense forest of thick steel poles (100+ poles)
- Maze-like walls and structures (20+ walls)
- Larger play area for exploration (2x canvas size)
- Collision detection with walls and obstacles
- Procedurally generated layout

### Escape Objective
- Find your ship at the edge of the steel forest
- Ship visible through LIDAR scanner with yellow signature
- Victory screen upon reaching the ship
- Ship spawns at a random edge location

## 🎯 Controls

### Movement
- **Mouse**: Look around
- **W**: Move forward
- **S**: Move backward
- **A**: Move left
- **D**: Move right

### Actions
- **SPACE**: Activate LIDAR scanner
- **Click**: Lock mouse pointer for better control

## 🛠️ Technical Implementation

### Core Systems
- Built with vanilla JavaScript and HTML5 Canvas
- Real-time LIDAR visualization using ray casting
- Smooth player movement with vector-based controls
- Delta time-based game loop for consistent performance

### Advanced Features
- Efficient collision detection and object scanning
- Pointer lock API for better mouse control
- Cooldown system for scanning mechanics
- Ray casting for LIDAR visualization
- Collision detection for walls and obstacles

## 📝 Development History

### Version 1.1.0 (Current)
- Added mouse-controlled camera
- Implemented scanning cooldown system
- Added walls and complex environment
- Introduced escape ship objective
- Added collision detection
- Improved monster AI with wall avoidance
- Enhanced LIDAR visualization with color coding
- Added victory condition

### Version 1.0.0 (Initial Release)
- Basic game structure and mechanics
- First-person perspective implementation
- LIDAR scanning system
- Monster AI and delayed spawn
- Steel pole forest generation

### Future Improvements
- [ ] Add sound effects and ambient audio
- [ ] Implement game over conditions
- [ ] Add difficulty levels
- [ ] Include more environmental hazards
- [ ] Add a scoring system
- [ ] Add multiple levels
- [ ] Implement save/load system
- [ ] Add particle effects for scanning
- [ ] Implement fog of war
- [ ] Add power-ups and collectibles

## 🚀 How to Run

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Click to lock mouse pointer
4. Use WASD to move and SPACE to scan
5. Find your way to the ship while avoiding the monster

## 🎨 Visual Style

### Environment
- Dark, atmospheric environment
- Minimalist design focusing on LIDAR visualization
- Clear visual feedback for player actions

### LIDAR Visualization
- Distinct color coding for different detected objects:
  - Green: Steel poles
  - Red: Monster
  - Cyan: Walls
  - Yellow: Escape ship
- Cooldown indicator for scanning
- Scan progress visualization
- Victory screen upon completion

## 🎮 Gameplay Tips

1. Use the LIDAR scanner strategically due to the cooldown
2. Remember the color coding for different objects
3. Keep track of the monster's position using red LIDAR lines
4. Look for the yellow ship signature in your scans
5. Use walls to your advantage when avoiding the monster
6. Plan your route before moving to conserve scan uses

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements. All contributions are welcome!

### How to Contribute
1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by classic horror games
- Built with HTML5 Canvas and JavaScript
- Special thanks to the open-source community 