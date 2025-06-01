# LIDAR Horror Game

A first-person horror game where you navigate through a dense forest of steel poles using a LIDAR scanner to visualize your surroundings. Your goal is to find your ship at the edge of the steel forest while avoiding a mysterious monster that lurks in the darkness.

## Features

### First-Person Perspective
- Immersive 3D environment built with Three.js
- Mouse-controlled camera movement with pointer lock
- Smooth movement controls using WASD keys
- Body cam-style visual filter with noise and vignette effects

### LIDAR Scanning System
- Real-time 3D scanning visualization
- 5-second cooldown between scans
- Color-coded scanning results:
  - Green: Steel poles
  - Cyan: Walls and structures
  - Red: Monster
  - Yellow: Ship
- Distance-based opacity for scan lines
- Persistent scan history that fades over time

### Dynamic Monster AI
- Monster spawns after 60 seconds of player movement
- Navigates around walls and obstacles
- Appears as red in LIDAR scans
- Continuously pursues the player

### Complex Environment
- Dense forest of 100+ steel poles
- 20+ walls creating maze-like structures
- Realistic 3D collision detection
- Dynamic lighting and shadows

### Escape Objective
- Find your ship at the edge of the steel forest
- Victory screen upon reaching the ship
- Increasing tension as the monster spawns

## Controls
- WASD: Move
- Mouse: Look around
- Click: Lock mouse pointer
- Space: Activate LIDAR scan
- ESC: Release mouse pointer

## Technical Implementation

### 3D Rendering
- Built with Three.js for high-performance 3D graphics
- Custom shaders for visual effects
- Efficient collision detection using raycasting
- Dynamic lighting system

### LIDAR System
- Raycasting-based scanning mechanism
- Distance-based opacity calculations
- Persistent scan history with time-based decay
- Color-coded object detection

### Visual Effects
- Body cam-style filter with:
  - Dynamic noise effect
  - Vignette darkening
  - Subtle color grading
- Realistic 3D models and materials
- Dynamic shadows and lighting

## Development History

### Version 1.2.0 (Current)
- Implemented 3D environment using Three.js
- Added body cam-style visual filter
- Enhanced LIDAR visualization in 3D space
- Improved monster AI with 3D pathfinding
- Added dynamic lighting and shadows

### Version 1.1.0
- Added mouse controls for camera movement
- Implemented scanning cooldown
- Created more complex environment with walls
- Added escape objective with ship
- Enhanced monster AI

### Version 1.0.0
- Initial release
- Basic first-person movement
- LIDAR scanning system
- Monster AI
- Simple environment

## Future Improvements
- [ ] Add sound effects and ambient audio
- [ ] Implement more complex monster behaviors
- [ ] Add power-ups and collectibles
- [ ] Create multiple levels with increasing difficulty
- [ ] Add particle effects for environmental atmosphere
- [ ] Implement more advanced visual effects
- [ ] Add multiplayer support
- [ ] Create a level editor

## How to Run
1. Clone the repository
2. Open `index.html` in a modern web browser
3. Click to start and lock the mouse pointer
4. Use WASD to move and mouse to look around
5. Press Space to activate the LIDAR scanner
6. Find the ship to win!

## Dependencies
- Three.js for 3D rendering
- Custom shaders for visual effects

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Three.js community for 3D rendering capabilities
- Inspiration from classic horror games
- Body cam footage for visual style reference 