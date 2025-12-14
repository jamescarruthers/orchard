# Orchard

A web-based chord generator inspired by the [Telepathic Instruments Orchid](https://telepathicinstruments.com/). Transform single key presses into full chords with customizable voicings, performance modes, and split keyboard support.

## Features

### Chord Generation
- **Chord Types**: Major, Minor, Sus4, Diminished
- **Extensions**: 6th, minor 7th, Major 7th, 9th
- **Voicing Control**: Adjust chord inversions (-4 to +4)
- **Bass Control**: Shift bass note octave (-2 to +2)

### Performance Modes
- **Off**: Play chords directly
- **Strum**: Arpeggiate notes with adjustable speed
- **Strum 2 Oct**: Strum across two octaves
- **Slop**: Humanized strum with random timing
- **Arpeggiator**: Rhythmic patterns synced to BPM
- **Arp 2 Oct**: Arpeggiator across two octaves
- **Harp**: Cascading harp-style sweeps

### Key/Scale Modes
- **Scales**: Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Pentatonic Major/Minor, Blues
- **Quantize to Key**: Snap input notes to the selected scale
- **Auto Chord Type**: Automatically select chord quality based on scale degree

### Split Keyboard
Split your MIDI keyboard into two independent zones, each with its own:
- Mode (Chord Generation or Pass-through)
- Chord type settings
- Playstyle (Simple, Advanced, Free)
- Performance mode
- Key/Scale settings

### MIDI Support
- **MIDI Input**: Connect any MIDI keyboard or controller
- **MIDI Output**: Route generated chords to DAWs or hardware synths
- **Velocity Sensitivity**: Input velocity is preserved in output
- **Suppress Root**: Option to omit the root note (useful when your input device plays the note)

### Visual Feedback
- On-screen keyboard shows input notes (red) and generated notes (teal)
- Real-time chord name and note display

## Usage

### Quick Start
1. Open `index.html` in a modern browser (Chrome recommended for Web MIDI)
2. Select a MIDI input device (or use computer keyboard: A-L for white keys, W-P for black keys)
3. Select a MIDI output device to send chords to your DAW
4. Press keys to generate chords

### Playstyles
- **Simple**: Chord type buttons toggle on/off
- **Advanced**: Chord type persists until changed (default)
- **Free**: Chord type only active while button is held

### Keyboard Shortcuts
- **1-4**: Select chord type (Maj, Min, Sus, Dim)
- **5-8**: Toggle extensions (6, m7, M7, 9)
- **A-L**: White keys (C to high C)
- **W, E, T, Y, U, O, P**: Black keys

## Browser Requirements

- Modern browser with Web MIDI API support (Chrome, Edge, Opera)
- Firefox requires enabling `dom.webmidi.enabled` in `about:config`
- Safari does not currently support Web MIDI

## Files

- `index.html` - Main HTML structure
- `orchard.js` - Engine and UI logic
- `styles.css` - Styling

## Credits

Inspired by [Orchid by Telepathic Instruments](https://telepathicinstruments.com/) - a hardware chord generator designed to make playing chords accessible to everyone.

## License

MIT License - feel free to use, modify, and distribute.
