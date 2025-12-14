// =============================================================================
// ORCHARD - Chord Generator Web App
// Inspired by Telepathic Instruments Orchid
// =============================================================================

// =============================================================================
// DATA STRUCTURES
// =============================================================================

const CHORD_INTERVALS = {
  'Maj': [0, 4, 7],
  'Min': [0, 3, 7],
  'Sus': [0, 5, 7],
  'Dim': [0, 3, 6]
};

const EXTENSION_INTERVALS = {
  '6': 9,
  'm7': 10,
  'M7': 11,
  '9': 14
};

const KEY_MODE_MAPPINGS = {
  'major': {
    0: 'Maj', 2: 'Min', 4: 'Min', 5: 'Maj',
    7: 'Maj', 9: 'Min', 11: 'Dim'
  },
  'natural_minor': {
    0: 'Min', 2: 'Dim', 3: 'Maj', 5: 'Min',
    7: 'Min', 8: 'Maj', 10: 'Maj'
  },
  'harmonic_minor': {
    0: 'Min', 2: 'Dim', 3: 'Maj', 5: 'Min',
    7: 'Maj', 8: 'Maj', 11: 'Dim'
  }
};

const SCALE_DEGREES = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'natural_minor': [0, 2, 3, 5, 7, 8, 10],
  'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'pentatonic_major': [0, 2, 4, 7, 9],
  'pentatonic_minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10]
};

// Chord mappings for additional scales
const ADDITIONAL_KEY_MODE_MAPPINGS = {
  'dorian': {
    0: 'Min', 2: 'Min', 3: 'Maj', 5: 'Maj',
    7: 'Min', 9: 'Dim', 10: 'Maj'
  },
  'mixolydian': {
    0: 'Maj', 2: 'Min', 4: 'Dim', 5: 'Maj',
    7: 'Min', 9: 'Min', 10: 'Maj'
  },
  'pentatonic_major': {
    0: 'Maj', 2: 'Min', 4: 'Min', 7: 'Maj', 9: 'Min'
  },
  'pentatonic_minor': {
    0: 'Min', 3: 'Maj', 5: 'Min', 7: 'Min', 10: 'Maj'
  },
  'blues': {
    0: 'Min', 3: 'Maj', 5: 'Min', 6: 'Dim', 7: 'Min', 10: 'Maj'
  }
};

const NOTE_DIVISIONS = {
  '1/4': 1,
  '1/8': 2,
  '1/12': 3,
  '1/16': 4,
  '1/24': 6,
  '1/32': 8
};

const MIDI_CHANNELS = {
  CHORD: 0,
  PERFORMANCE: 1,
  BASS: 2
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Keyboard mapping: computer keys to note offsets (0 = C)
const KEYBOARD_MAP = {
  // White keys
  'a': 0,  // C
  's': 2,  // D
  'd': 4,  // E
  'f': 5,  // F
  'g': 7,  // G
  'h': 9,  // A
  'j': 11, // B
  'k': 12, // C (octave up)
  'l': 14, // D (octave up)
  // Black keys
  'w': 1,  // C#
  'e': 3,  // D#
  't': 6,  // F#
  'y': 8,  // G#
  'u': 10, // A#
  'o': 13, // C# (octave up)
  'p': 15  // D# (octave up)
};

// =============================================================================
// CHORD GENERATION
// =============================================================================

function generateChord(rootNote, chordType, extensions = []) {
  const baseIntervals = [...CHORD_INTERVALS[chordType]];
  const allIntervals = [...baseIntervals];

  extensions.forEach(ext => {
    if (EXTENSION_INTERVALS.hasOwnProperty(ext)) {
      allIntervals.push(EXTENSION_INTERVALS[ext]);
    }
  });

  const uniqueIntervals = [...new Set(allIntervals)].sort((a, b) => a - b);
  const midiNotes = uniqueIntervals.map(interval => rootNote + interval);

  return midiNotes.filter(note => note >= 0 && note <= 127);
}

// =============================================================================
// VOICING
// =============================================================================

function applyVoicing(notes, position) {
  if (notes.length === 0) return notes;

  let result = [...notes].sort((a, b) => a - b);
  const steps = Math.abs(position);

  for (let i = 0; i < steps; i++) {
    if (position > 0) {
      const lowest = result.shift();
      result.push(lowest + 12);
      result.sort((a, b) => a - b);
    } else if (position < 0) {
      const highest = result.pop();
      result.unshift(highest - 12);
      result.sort((a, b) => a - b);
    }
  }

  return result.filter(note => note >= 0 && note <= 127);
}

function applyBassVoicing(rootNote, bassOctave) {
  const bassNote = rootNote + (bassOctave * 12);
  return Math.max(24, Math.min(60, bassNote));
}

// =============================================================================
// KEY MODE
// =============================================================================

function getKeyModeChordType(pressedNote, keyRoot, scaleType = 'major') {
  const interval = ((pressedNote % 12) - keyRoot + 12) % 12;
  const scaleDegrees = SCALE_DEGREES[scaleType];

  // Get mapping from either main or additional mappings
  const mapping = KEY_MODE_MAPPINGS[scaleType] || ADDITIONAL_KEY_MODE_MAPPINGS[scaleType];

  if (!mapping) return 'Maj'; // Fallback

  if (mapping.hasOwnProperty(interval)) {
    return mapping[interval];
  } else {
    const quantized = quantizeToScale(interval, scaleDegrees);
    return mapping[quantized] || 'Maj';
  }
}

/**
 * Quantizes a MIDI note to the nearest note in the scale
 *
 * @param {number} midiNote - The input MIDI note (0-127)
 * @param {number} keyRoot - The root note of the key (0-11)
 * @param {string} scaleType - The scale type
 * @returns {number} The quantized MIDI note
 */
function quantizeNoteToKey(midiNote, keyRoot, scaleType) {
  const scaleDegrees = SCALE_DEGREES[scaleType];
  if (!scaleDegrees) return midiNote;

  const octave = Math.floor(midiNote / 12);
  const noteInOctave = midiNote % 12;
  const interval = ((noteInOctave - keyRoot) + 12) % 12;

  // Check if already in scale
  if (scaleDegrees.includes(interval)) {
    return midiNote;
  }

  // Find nearest scale degree
  let nearestInterval = scaleDegrees[0];
  let minDistance = 12;

  for (const degree of scaleDegrees) {
    const distance = Math.min(
      Math.abs(interval - degree),
      Math.abs(interval - degree + 12),
      Math.abs(interval - degree - 12)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestInterval = degree;
    }
  }

  // Convert back to MIDI note
  const quantizedNoteInOctave = (keyRoot + nearestInterval) % 12;
  let quantizedNote = (octave * 12) + quantizedNoteInOctave;

  // Handle octave boundary cases
  if (quantizedNoteInOctave < noteInOctave && (noteInOctave - quantizedNoteInOctave) > 6) {
    quantizedNote += 12;
  } else if (quantizedNoteInOctave > noteInOctave && (quantizedNoteInOctave - noteInOctave) > 6) {
    quantizedNote -= 12;
  }

  return Math.max(0, Math.min(127, quantizedNote));
}

function quantizeToScale(interval, scaleDegrees) {
  let nearestDegree = scaleDegrees[0];
  let minDistance = 12;

  for (const degree of scaleDegrees) {
    const distance = Math.min(
      Math.abs(interval - degree),
      Math.abs(interval - degree + 12),
      Math.abs(interval - degree - 12)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestDegree = degree;
    }
  }

  return nearestDegree;
}

// =============================================================================
// PERFORMANCE ENGINE
// =============================================================================

function generateStrum(notes, dialPosition, velocity, options = {}) {
  const { twoOctaves = false, slop = 0 } = options;

  let sequence = [...notes].sort((a, b) => a - b);

  if (twoOctaves) {
    const octaveUp = sequence.map(n => n + 12).filter(n => n <= 127);
    sequence = [...sequence, ...octaveUp].sort((a, b) => a - b);
  }

  const MIN_DELAY = 10;
  const MAX_DELAY = 100;
  const delayPerNote = MIN_DELAY + ((127 - dialPosition) / 127) * (MAX_DELAY - MIN_DELAY);
  const maxSlopMs = (slop / 127) * 50;

  const events = [];
  sequence.forEach((note, index) => {
    let timing = index * delayPerNote;

    if (slop > 0) {
      const randomOffset = (Math.random() - 0.5) * 2 * maxSlopMs;
      timing = Math.max(0, timing + randomOffset);
    }

    events.push({
      note,
      velocity,
      delayMs: timing,
      channel: MIDI_CHANNELS.PERFORMANCE
    });
  });

  return events;
}

function generateArpeggio(notes, bpm, pattern, division, velocity, options = {}) {
  const { twoOctaves = false } = options;

  let sequence = applyArpPattern(notes, pattern);

  if (twoOctaves) {
    const octaveUp = sequence.map(n => n + 12).filter(n => n <= 127);
    sequence = [...sequence, ...octaveUp];
  }

  const quarterNoteMs = 60000 / bpm;
  const divisor = NOTE_DIVISIONS[division];
  const stepMs = quarterNoteMs / divisor;
  const gateMs = stepMs * 0.85;

  const events = sequence.map((note, index) => ({
    note,
    velocity,
    delayMs: index * stepMs,
    durationMs: gateMs,
    channel: MIDI_CHANNELS.PERFORMANCE
  }));

  return {
    sequence: events,
    stepMs,
    gateMs,
    totalDurationMs: sequence.length * stepMs
  };
}

function applyArpPattern(notes, pattern) {
  const sorted = [...notes].sort((a, b) => a - b);

  switch (pattern) {
    case 'up':
      return sorted;
    case 'down':
      return [...sorted].reverse();
    case 'upDown':
      if (sorted.length <= 1) return sorted;
      return [...sorted, ...sorted.slice(1, -1).reverse()];
    case 'downUp':
      if (sorted.length <= 1) return sorted;
      const reversed = [...sorted].reverse();
      return [...reversed, ...reversed.slice(1, -1).reverse()];
    case 'random':
      return shuffleArray([...sorted]);
    default:
      return sorted;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateHarp(notes, bpm, velocity) {
  let expanded = [];
  const baseNotes = [...notes].sort((a, b) => a - b);

  for (let octave = 0; octave < 4; octave++) {
    baseNotes.forEach(note => {
      const expandedNote = note + (octave * 12);
      if (expandedNote <= 127) {
        expanded.push(expandedNote);
      }
    });
  }

  expanded.sort((a, b) => a - b);

  const quarterNoteMs = 60000 / bpm;
  const intervalMs = quarterNoteMs / 16;

  return expanded.map((note, index) => ({
    note,
    velocity,
    delayMs: index * intervalMs,
    channel: MIDI_CHANNELS.PERFORMANCE
  }));
}

// =============================================================================
// DISPLAY
// =============================================================================

function getChordDisplayName(rootNote, chordType, extensions) {
  const root = NOTE_NAMES[rootNote % 12];

  if (chordType === 'Maj' && extensions.includes('m7')) {
    const otherExts = extensions.filter(e => e !== 'm7');
    const extString = otherExts.join('');
    return `${root}7${extString}`;
  }

  let name = root;

  switch (chordType) {
    case 'Min': name += 'm'; break;
    case 'Sus': name += 'sus4'; break;
    case 'Dim': name += 'dim'; break;
  }

  const extCount = extensions.length;

  if (extCount === 0) {
    return name;
  } else if (extCount === 1) {
    return name + extensions[0];
  } else if (extCount === 2) {
    return name + extensions.join('');
  } else if (extCount === 3) {
    return name + ' JAZZ';
  } else if (extCount === 4) {
    return name + ' ???';
  } else {
    return name + ' WTF?';
  }
}

function midiNoteToName(midiNote) {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTE_NAMES[midiNote % 12];
  return `${noteName}${octave}`;
}

// =============================================================================
// MIDI OUTPUT
// =============================================================================

class OrchardMIDI {
  constructor() {
    this.output = null;
    this.input = null;
    this.midiAccess = null;
    this.pendingTimeouts = [];
    this.activeNotes = new Map();
    this.onNoteOn = null;
    this.onNoteOff = null;

    for (let ch = 0; ch < 3; ch++) {
      this.activeNotes.set(ch, new Set());
    }
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported');
    }

    this.midiAccess = await navigator.requestMIDIAccess();
    return {
      inputs: Array.from(this.midiAccess.inputs.values()),
      outputs: Array.from(this.midiAccess.outputs.values())
    };
  }

  selectOutput(output) {
    this.output = output;
  }

  selectInput(input) {
    // Remove listener from previous input
    if (this.input) {
      this.input.onmidimessage = null;
    }

    this.input = input;

    if (input) {
      input.onmidimessage = (event) => this.handleMIDIMessage(event);
    }
  }

  handleMIDIMessage(event) {
    const [status, note, velocity] = event.data;
    const command = status & 0xF0;
    const channel = status & 0x0F;

    // Note On
    if (command === 0x90 && velocity > 0) {
      if (this.onNoteOn) {
        this.onNoteOn(note, velocity, channel);
      }
    }
    // Note Off (or Note On with velocity 0)
    else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      if (this.onNoteOff) {
        this.onNoteOff(note, channel);
      }
    }
  }

  noteOn(channel, note, velocity) {
    if (!this.output) return;

    const status = 0x90 | (channel & 0x0F);
    this.output.send([status, note & 0x7F, velocity & 0x7F]);
    this.activeNotes.get(channel).add(note);
  }

  noteOff(channel, note) {
    if (!this.output) return;

    const status = 0x80 | (channel & 0x0F);
    this.output.send([status, note & 0x7F, 0]);
    this.activeNotes.get(channel).delete(note);
  }

  allNotesOff(channel) {
    const active = this.activeNotes.get(channel);
    if (active) {
      active.forEach(note => this.noteOff(channel, note));
    }
  }

  cancelPending() {
    this.pendingTimeouts.forEach(id => clearTimeout(id));
    this.pendingTimeouts = [];
  }

  scheduleBatch(events, cancelPrevious = true) {
    if (cancelPrevious) {
      this.cancelPending();
    }

    events.forEach(event => {
      const timeoutId = setTimeout(() => {
        if (event.type === 'noteOn') {
          this.noteOn(event.channel, event.note, event.velocity);

          if (event.durationMs) {
            const offId = setTimeout(() => {
              this.noteOff(event.channel, event.note);
            }, event.durationMs);
            this.pendingTimeouts.push(offId);
          }
        } else {
          this.noteOff(event.channel, event.note);
        }
      }, event.timestamp || 0);

      this.pendingTimeouts.push(timeoutId);
    });
  }
}

// =============================================================================
// MAIN ENGINE
// =============================================================================

class OrchardEngine {
  constructor() {
    this.midi = new OrchardMIDI();
    this.state = this.getDefaultState();
    this.audioContext = null;
    this.oscillators = new Map();
    this.generatedNotes = new Set(); // Track which notes are being generated

    // Set up MIDI input callbacks
    this.midi.onNoteOn = (note, velocity, channel) => {
      this.onMIDINoteOn(note, velocity);
    };
    this.midi.onNoteOff = (note, channel) => {
      this.onMIDINoteOff(note);
    };
  }

  onMIDINoteOn(midiNote, velocity) {
    const keyNote = midiNote % 12;

    // Highlight the input key
    this.highlightInputKey(keyNote, true);

    // Determine mode based on split settings
    const mode = this.getModeForNote(midiNote);

    if (mode === 'off') {
      // Pass-through mode - send MIDI note directly without chord generation
      this.state.passThroughNotes.add(midiNote);
      this.midi.noteOn(MIDI_CHANNELS.CHORD, midiNote, velocity);
      this.playAudioNote(midiNote, velocity);
      return;
    }

    if (mode === 'quantize') {
      // Quantize mode - pass through but snap to scale
      const settings = this.getEffectiveSettings(midiNote);
      // In quantize mode, always quantize (use the scale settings regardless of checkbox)
      const outputNote = quantizeNoteToKey(
        midiNote,
        settings.quantize.root,
        settings.quantize.scale
      );

      // Track this as a pass-through note (store original for release matching)
      this.state.passThroughNotes.add(midiNote);
      // Also track the quantized note so we can turn it off
      this.state.quantizedNoteMap = this.state.quantizedNoteMap || new Map();
      this.state.quantizedNoteMap.set(midiNote, outputNote);

      this.midi.noteOn(MIDI_CHANNELS.CHORD, outputNote, velocity);
      this.playAudioNote(outputNote, velocity);

      // Highlight the quantized note
      this.highlightGeneratedNotes([outputNote]);

      // Update display
      const noteName = NOTE_NAMES[outputNote % 12];
      const octave = Math.floor(outputNote / 12) - 1;
      this.updateDisplay(`${noteName}${octave}`, [outputNote]);
      return;
    }

    // Chord generation mode
    // Store the actual MIDI note for proper release
    this.state.activeMidiNote = midiNote;
    this.state.activeKey = keyNote;
    this.state.velocity = velocity;

    // Get zone-specific chord type if split enabled
    const zoneChordType = this.getZoneChordType(midiNote);
    this.updateOutputWithOptions(velocity, midiNote, zoneChordType);
  }

  onMIDINoteOff(midiNote) {
    const keyNote = midiNote % 12;
    this.highlightInputKey(keyNote, false);

    // Check if this was a pass-through note
    if (this.state.passThroughNotes.has(midiNote)) {
      this.state.passThroughNotes.delete(midiNote);

      // Check if this was a quantized note
      if (this.state.quantizedNoteMap && this.state.quantizedNoteMap.has(midiNote)) {
        const quantizedNote = this.state.quantizedNoteMap.get(midiNote);
        this.state.quantizedNoteMap.delete(midiNote);
        this.midi.noteOff(MIDI_CHANNELS.CHORD, quantizedNote);
        this.stopAudioNote(quantizedNote);
        this.clearGeneratedHighlights();
      } else {
        this.midi.noteOff(MIDI_CHANNELS.CHORD, midiNote);
        this.stopAudioNote(midiNote);
      }
      return;
    }

    // Chord generation note release
    if (this.state.activeMidiNote === midiNote) {
      this.stopOutput();
      this.state.activeKey = null;
      this.state.activeMidiNote = null;
    }
  }

  getModeForNote(midiNote) {
    if (!this.state.split.enabled) {
      return this.state.globalMode;
    }

    // Split mode: determine which zone
    if (midiNote < this.state.split.point) {
      return this.state.split.lower.mode;
    } else {
      return this.state.split.upper.mode;
    }
  }

  getZoneChordType(midiNote) {
    if (!this.state.split.enabled) {
      return null; // Use manual buttons
    }

    // Get zone-specific chord type
    const zone = this.getZoneForNote(midiNote);
    return zone.chordType || null; // '' means manual, specific value overrides
  }

  getZoneForNote(midiNote) {
    return midiNote < this.state.split.point ? this.state.split.lower : this.state.split.upper;
  }

  getEffectiveSettings(midiNote) {
    // Returns the effective settings for a note (zone-specific if split enabled, global otherwise)
    if (!this.state.split.enabled) {
      return {
        playstyle: this.state.playstyle,
        performanceMode: this.state.performanceMode,
        keyMode: this.state.keyMode,
        quantize: this.state.quantize
      };
    }

    const zone = this.getZoneForNote(midiNote);
    return {
      playstyle: zone.playstyle,
      performanceMode: zone.performanceMode,
      keyMode: zone.keyMode,
      quantize: zone.quantize
    };
  }

  highlightInputKey(keyNote, active) {
    const keyEl = document.querySelector(`.key[data-note="${keyNote}"]`);
    if (keyEl) {
      if (active) {
        keyEl.classList.add('active');
      } else {
        keyEl.classList.remove('active');
      }
    }
  }

  highlightGeneratedNotes(notes) {
    // Clear previous generated highlights
    this.clearGeneratedHighlights();

    // Highlight new generated notes
    notes.forEach(midiNote => {
      const keyNote = midiNote % 12;
      const keyEl = document.querySelector(`.key[data-note="${keyNote}"]`);
      if (keyEl) {
        keyEl.classList.add('generated');
        this.generatedNotes.add(keyNote);
      }
    });
  }

  clearGeneratedHighlights() {
    this.generatedNotes.forEach(keyNote => {
      const keyEl = document.querySelector(`.key[data-note="${keyNote}"]`);
      if (keyEl) {
        keyEl.classList.remove('generated');
      }
    });
    this.generatedNotes.clear();
  }

  getDefaultState() {
    return {
      keyMode: { enabled: false, root: 0, scale: 'major' },
      quantize: { enabled: false, root: 0, scale: 'major' },
      playstyle: 'advanced',
      performanceMode: 'off',
      voicingPosition: 0,
      bassOctave: 0,
      performanceDial: 64,
      bpm: 120,
      arpPattern: 'up',
      arpDivision: '1/8',
      activeKey: null,
      activeMidiNote: null,
      activeChordType: null,
      activeExtensions: [],
      currentChord: [],
      velocity: 100,
      suppressRoot: false,
      muteAudio: false,
      // Global mode (when split disabled)
      globalMode: 'chord', // 'off' or 'chord'
      // Split keyboard settings
      split: {
        enabled: false,
        point: 60, // Middle C (C4)
        lower: {
          mode: 'chord', // 'off' or 'chord'
          chordType: '', // '' = manual, 'Maj'/'Min'/etc = fixed, 'auto' = from scale
          playstyle: 'advanced',
          performanceMode: 'off',
          keyMode: { enabled: false, root: 0, scale: 'major' },
          quantize: { enabled: false, root: 0, scale: 'major' }
        },
        upper: {
          mode: 'off',
          chordType: '',
          playstyle: 'advanced',
          performanceMode: 'off',
          keyMode: { enabled: false, root: 0, scale: 'major' },
          quantize: { enabled: false, root: 0, scale: 'major' }
        }
      },
      // Track active notes for pass-through
      passThroughNotes: new Set()
    };
  }

  selectMIDIInput(input) {
    this.midi.selectInput(input);
  }

  async init() {
    try {
      return await this.midi.init();
    } catch (e) {
      console.warn('MIDI not available:', e.message);
      return [];
    }
  }

  selectMIDIOutput(output) {
    this.midi.selectOutput(output);
  }

  // Initialize Web Audio for sound preview
  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play a note using Web Audio (for preview without MIDI)
  playAudioNote(midiNote, velocity = 100) {
    if (!this.audioContext) this.initAudio();

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.value = (velocity / 127) * 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 2);

    this.oscillators.set(midiNote, { osc, gain });

    return { osc, gain };
  }

  stopAudioNote(midiNote) {
    const oscData = this.oscillators.get(midiNote);
    if (oscData) {
      oscData.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
      oscData.gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
      setTimeout(() => {
        try { oscData.osc.stop(); } catch (e) {}
      }, 100);
      this.oscillators.delete(midiNote);
    }
  }

  stopAllAudio() {
    this.oscillators.forEach((oscData, note) => {
      this.stopAudioNote(note);
    });
  }

  onKeyDown(keyNote, velocity = 100) {
    // Convert to a MIDI note (assume octave 4 for computer keyboard)
    const midiNote = keyNote + 48;

    // Route through the same logic as MIDI input
    this.onMIDINoteOn(midiNote, velocity);
  }

  onKeyUp(keyNote) {
    // Convert to a MIDI note (assume octave 4 for computer keyboard)
    const midiNote = keyNote + 48;

    // Route through the same logic as MIDI input
    this.onMIDINoteOff(midiNote);
  }

  onChordType(chordType, isPressed) {
    if (isPressed) {
      this.state.activeChordType = chordType;
    } else {
      // Get effective playstyle (zone-specific if split enabled)
      const effectiveNote = this.state.activeMidiNote !== null ? this.state.activeMidiNote : 60;
      const settings = this.getEffectiveSettings(effectiveNote);
      if (settings.playstyle === 'free') {
        this.state.activeChordType = null;
      }
    }

    if (this.state.activeKey !== null) {
      this.updateOutput(this.state.velocity);
    }
  }

  onExtension(extension, isPressed) {
    if (isPressed) {
      if (!this.state.activeExtensions.includes(extension)) {
        this.state.activeExtensions.push(extension);
      }
    } else {
      this.state.activeExtensions = this.state.activeExtensions.filter(e => e !== extension);
    }

    // Get effective performance mode (zone-specific if split enabled)
    const effectiveNote = this.state.activeMidiNote !== null ? this.state.activeMidiNote : 60;
    const settings = this.getEffectiveSettings(effectiveNote);

    // For arp modes, don't restart - let the loop pick up changes on next cycle
    const isArpMode = settings.performanceMode === 'arp' || settings.performanceMode === 'arp2oct';

    if (this.state.activeKey !== null && !isArpMode) {
      this.updateOutput(this.state.velocity);
    }
  }

  updateOutput(velocity = 100) {
    this.updateOutputWithOptions(velocity, null, null);
  }

  updateOutputWithOptions(velocity = 100, midiNote = null, zoneChordType = null) {
    if (this.state.activeKey === null) return;

    // Use the actual MIDI note's octave if provided, otherwise default to octave 4
    let keyNote = this.state.activeKey;
    let rootNote = midiNote !== null ? midiNote : keyNote + 48;

    // Get effective settings (zone-specific if split enabled)
    const effectiveNote = midiNote !== null ? midiNote : keyNote + 48;
    const settings = this.getEffectiveSettings(effectiveNote);

    // Apply quantization if enabled
    if (settings.quantize.enabled) {
      rootNote = quantizeNoteToKey(
        rootNote,
        settings.quantize.root,
        settings.quantize.scale
      );
      keyNote = rootNote % 12;
    }

    // Determine chord type: zone override > manual selection > key mode auto
    let chordType = null;

    if (zoneChordType === 'auto') {
      // Auto mode: derive from scale
      chordType = getKeyModeChordType(
        keyNote,
        settings.keyMode.root,
        settings.keyMode.scale
      );
    } else if (zoneChordType) {
      // Fixed chord type from zone
      chordType = zoneChordType;
    } else {
      // Manual mode: use button selection or key mode
      chordType = this.state.activeChordType;

      if (!chordType && settings.keyMode.enabled) {
        chordType = getKeyModeChordType(
          keyNote,
          settings.keyMode.root,
          settings.keyMode.scale
        );
      }
    }

    let output;
    let displayName;

    if (chordType) {
      const baseChord = generateChord(rootNote, chordType, this.state.activeExtensions);
      this.state.currentChord = applyVoicing(baseChord, this.state.voicingPosition);
      output = this.state.currentChord;
      displayName = getChordDisplayName(rootNote, chordType, this.state.activeExtensions);
    } else {
      this.state.currentChord = [rootNote];
      output = [rootNote];
      displayName = NOTE_NAMES[rootNote % 12];
    }

    // Update display
    this.updateDisplay(displayName, output);

    // Highlight generated notes on keyboard
    this.highlightGeneratedNotes(output);

    // Send output (pass rootNote for suppress filtering and settings for performance mode)
    this.sendOutput(output, velocity, rootNote, settings);
  }

  updateDisplay(chordName, notes) {
    const nameEl = document.getElementById('chordName');
    const notesEl = document.getElementById('chordNotes');

    if (nameEl) nameEl.textContent = chordName;
    if (notesEl) notesEl.textContent = notes.map(midiNoteToName).join(' ');
  }

  sendOutput(notes, velocity, rootNote, settings = null) {
    // Stop previous audio
    this.stopAllAudio();

    // Use provided settings or fall back to global state
    const perfMode = settings ? settings.performanceMode : this.state.performanceMode;

    // Filter out root note if suppress is enabled
    // The root note class (pitch class 0-11) should be removed from all octaves
    const rootPitchClass = rootNote % 12;
    const filterRoot = (noteArray) => {
      if (!this.state.suppressRoot) return noteArray;
      return noteArray.filter(n => (n % 12) !== rootPitchClass);
    };

    // Send raw chord on channel 1 (filtered)
    this.midi.allNotesOff(MIDI_CHANNELS.CHORD);
    filterRoot(notes).forEach(note => {
      this.midi.noteOn(MIDI_CHANNELS.CHORD, note, velocity);
    });

    // Send bass on channel 3 (only if not suppressing, since bass is root-based)
    const bassNote = applyBassVoicing(notes[0], this.state.bassOctave);
    this.midi.allNotesOff(MIDI_CHANNELS.BASS);
    if (!this.state.suppressRoot) {
      this.midi.noteOn(MIDI_CHANNELS.BASS, bassNote, velocity);
    }

    // Handle performance mode on channel 2
    this.midi.cancelPending();
    this.midi.allNotesOff(MIDI_CHANNELS.PERFORMANCE);

    let events = [];

    // Use filtered notes for performance modes
    const filteredNotes = filterRoot(notes);

    switch (perfMode) {
      case 'strum':
        events = generateStrum(filteredNotes, this.state.performanceDial, velocity);
        break;
      case 'strum2oct':
        events = generateStrum(filteredNotes, this.state.performanceDial, velocity, { twoOctaves: true });
        break;
      case 'slop':
        events = generateStrum(filteredNotes, this.state.performanceDial, velocity, { slop: this.state.performanceDial });
        break;
      case 'arp':
        this.startArpLoop({ twoOctaves: false });
        this.playArpAudio({ twoOctaves: false });
        return;
      case 'arp2oct':
        this.startArpLoop({ twoOctaves: true });
        this.playArpAudio({ twoOctaves: true });
        return;
      case 'harp':
        events = generateHarp(filteredNotes, this.state.bpm, velocity);
        break;
      case 'off':
      default:
        // Play audio preview for chord (filtered)
        filterRoot(notes).forEach(note => this.playAudioNote(note, velocity));
        return;
    }

    // Schedule non-looping events
    const midiEvents = events.map(e => ({
      type: 'noteOn',
      channel: e.channel,
      note: e.note,
      velocity: e.velocity,
      timestamp: e.delayMs,
      durationMs: e.durationMs
    }));

    this.midi.scheduleBatch(midiEvents);

    // Play audio preview for strummed/harped notes
    events.forEach(e => {
      setTimeout(() => {
        if (this.state.activeKey !== null) {
          this.playAudioNote(e.note, e.velocity);
        }
      }, e.delayMs);
    });
  }

  playArpAudio(arpParams) {
    const { twoOctaves } = arpParams;

    const playSequence = () => {
      // Regenerate chord with current extensions
      const currentNotes = this.generateCurrentArpNotes();
      if (!currentNotes) return;

      const arpResult = generateArpeggio(
        currentNotes,
        this.state.bpm,
        this.state.arpPattern,
        this.state.arpDivision,
        this.state.velocity,
        { twoOctaves }
      );

      arpResult.sequence.forEach(e => {
        setTimeout(() => {
          if (this.state.activeKey !== null) {
            this.playAudioNote(e.note, e.velocity);
            setTimeout(() => this.stopAudioNote(e.note), e.durationMs || 200);
          }
        }, e.delayMs);
      });

      return arpResult.totalDurationMs;
    };

    const totalDurationMs = playSequence();

    // Loop with dynamic regeneration
    const scheduleNext = () => {
      this.arpAudioLoop = setTimeout(() => {
        if (this.state.activeKey !== null) {
          const nextDuration = playSequence();
          if (nextDuration) scheduleNext();
        }
      }, totalDurationMs);
    };

    if (totalDurationMs) scheduleNext();
  }

  startArpLoop(arpParams) {
    const { twoOctaves } = arpParams;

    const playSequence = () => {
      // Regenerate chord with current extensions
      const currentNotes = this.generateCurrentArpNotes();
      if (!currentNotes) return null;

      const arpResult = generateArpeggio(
        currentNotes,
        this.state.bpm,
        this.state.arpPattern,
        this.state.arpDivision,
        this.state.velocity,
        { twoOctaves }
      );

      const events = arpResult.sequence.map(e => ({
        type: 'noteOn',
        channel: e.channel,
        note: e.note,
        velocity: e.velocity,
        timestamp: e.delayMs,
        durationMs: e.durationMs
      }));

      this.midi.scheduleBatch(events, false);

      return arpResult.totalDurationMs;
    };

    const totalDurationMs = playSequence();

    // Loop with dynamic regeneration
    const scheduleNext = () => {
      const loopId = setTimeout(() => {
        if (this.state.activeKey !== null) {
          const nextDuration = playSequence();
          if (nextDuration) scheduleNext();
        }
      }, totalDurationMs);

      this.midi.pendingTimeouts.push(loopId);
    };

    if (totalDurationMs) scheduleNext();
  }

  generateCurrentArpNotes() {
    if (this.state.activeKey === null) return null;

    let keyNote = this.state.activeKey;
    let rootNote = this.state.activeMidiNote !== null ? this.state.activeMidiNote : keyNote + 48;

    // Get effective settings (zone-specific if split enabled)
    const settings = this.getEffectiveSettings(rootNote);

    // Apply quantization if enabled
    if (settings.quantize.enabled) {
      rootNote = quantizeNoteToKey(rootNote, settings.quantize.root, settings.quantize.scale);
      keyNote = rootNote % 12;
    }

    // Determine chord type
    let chordType = this.state.activeChordType;
    if (!chordType && settings.keyMode.enabled) {
      chordType = getKeyModeChordType(keyNote, settings.keyMode.root, settings.keyMode.scale);
    }

    if (!chordType) return [rootNote];

    const baseChord = generateChord(rootNote, chordType, this.state.activeExtensions);
    const voicedChord = applyVoicing(baseChord, this.state.voicingPosition);

    // Filter root if needed
    if (this.state.suppressRoot) {
      const rootPitchClass = rootNote % 12;
      return voicedChord.filter(n => (n % 12) !== rootPitchClass);
    }

    return voicedChord;
  }

  stopOutput() {
    this.midi.cancelPending();
    this.midi.allNotesOff(MIDI_CHANNELS.CHORD);
    this.midi.allNotesOff(MIDI_CHANNELS.PERFORMANCE);
    this.midi.allNotesOff(MIDI_CHANNELS.BASS);
    this.state.currentChord = [];

    // Stop audio
    this.stopAllAudio();
    if (this.arpAudioLoop) {
      clearInterval(this.arpAudioLoop);
    }

    // Clear generated note highlights
    this.clearGeneratedHighlights();

    // Update display
    const nameEl = document.getElementById('chordName');
    const notesEl = document.getElementById('chordNotes');
    if (nameEl) nameEl.textContent = '-';
    if (notesEl) notesEl.textContent = 'Press a key to play';
  }

  // Settings
  setPlaystyle(mode) { this.state.playstyle = mode; }
  setPerformanceMode(mode) { this.state.performanceMode = mode; }
  setVoicingDirect(position) { this.state.voicingPosition = position; }
  setBassOctave(octave) { this.state.bassOctave = octave; }
  setPerformanceDial(value) { this.state.performanceDial = value; }
  setBpm(bpm) { this.state.bpm = Math.max(40, Math.min(240, bpm)); }
  setArpPattern(pattern) { this.state.arpPattern = pattern; }
  setArpDivision(div) { this.state.arpDivision = div; }

  setKeyMode(enabled, root = 0, scale = 'major') {
    this.state.keyMode = { enabled, root, scale };
  }

  setQuantize(enabled, root = 0, scale = 'major') {
    this.state.quantize = { enabled, root, scale };
  }

  setSuppressRoot(enabled) {
    this.state.suppressRoot = enabled;
  }
}

// =============================================================================
// UI INITIALIZATION
// =============================================================================

let engine;
let midiInputs = [];
let midiOutputs = [];

async function initApp() {
  engine = new OrchardEngine();
  engine.initAudio();

  // Initialize MIDI
  try {
    const midiDevices = await engine.init();
    midiInputs = midiDevices.inputs || [];
    midiOutputs = midiDevices.outputs || [];
    updateMIDISelects();
  } catch (e) {
    console.warn('MIDI initialization failed:', e);
  }

  // Create keyboard UI
  createKeyboard();

  // Set up event listeners
  setupChordButtons();
  setupExtensionButtons();
  setupControls();
  setupKeyboardInput();
}

function updateMIDISelects() {
  // Update input select
  const inputSelect = document.getElementById('midiInput');
  inputSelect.innerHTML = '<option value="">Select MIDI Input...</option>';

  midiInputs.forEach((input, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = input.name;
    inputSelect.appendChild(option);
  });

  // Update output select
  const outputSelect = document.getElementById('midiOutput');
  outputSelect.innerHTML = '<option value="">Select MIDI Output...</option>';

  midiOutputs.forEach((output, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = output.name;
    outputSelect.appendChild(option);
  });
}

function createKeyboard() {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';

  // One octave of keys
  const keys = [
    { note: 0, type: 'white', label: 'C' },
    { note: 1, type: 'black', label: 'C#' },
    { note: 2, type: 'white', label: 'D' },
    { note: 3, type: 'black', label: 'D#' },
    { note: 4, type: 'white', label: 'E' },
    { note: 5, type: 'white', label: 'F' },
    { note: 6, type: 'black', label: 'F#' },
    { note: 7, type: 'white', label: 'G' },
    { note: 8, type: 'black', label: 'G#' },
    { note: 9, type: 'white', label: 'A' },
    { note: 10, type: 'black', label: 'A#' },
    { note: 11, type: 'white', label: 'B' },
    { note: 12, type: 'white', label: 'C' }
  ];

  keys.forEach(key => {
    const el = document.createElement('div');
    el.className = `key ${key.type}`;
    el.dataset.note = key.note;
    el.innerHTML = `<span class="label">${key.label}</span>`;

    // Mouse events
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      engine.onKeyDown(key.note);
      el.classList.add('active');
    });

    el.addEventListener('mouseup', () => {
      engine.onKeyUp(key.note);
      el.classList.remove('active');
    });

    el.addEventListener('mouseleave', () => {
      if (el.classList.contains('active')) {
        engine.onKeyUp(key.note);
        el.classList.remove('active');
      }
    });

    // Touch events
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      engine.onKeyDown(key.note);
      el.classList.add('active');
    });

    el.addEventListener('touchend', () => {
      engine.onKeyUp(key.note);
      el.classList.remove('active');
    });

    keyboard.appendChild(el);
  });
}

function setupChordButtons() {
  const buttons = document.querySelectorAll('.chord-btn');

  buttons.forEach(btn => {
    const chordType = btn.dataset.chord;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      // Deactivate other chord buttons
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.onChordType(chordType, true);
    });

    btn.addEventListener('mouseup', () => {
      if (engine.state.playstyle === 'free') {
        btn.classList.remove('active');
      }
      engine.onChordType(chordType, false);
    });

    btn.addEventListener('mouseleave', () => {
      if (btn.classList.contains('active') && engine.state.playstyle === 'free') {
        btn.classList.remove('active');
        engine.onChordType(chordType, false);
      }
    });
  });
}

function setupExtensionButtons() {
  const buttons = document.querySelectorAll('.ext-btn');

  buttons.forEach(btn => {
    const ext = btn.dataset.ext;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      engine.onExtension(ext, true);
    });

    btn.addEventListener('mouseup', () => {
      btn.classList.remove('active');
      engine.onExtension(ext, false);
    });

    btn.addEventListener('mouseleave', () => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        engine.onExtension(ext, false);
      }
    });
  });
}

function setupControls() {
  // Playstyle
  document.querySelectorAll('input[name="playstyle"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      engine.setPlaystyle(e.target.value);
      // Reset chord buttons when changing playstyle
      document.querySelectorAll('.chord-btn').forEach(b => b.classList.remove('active'));
      engine.state.activeChordType = null;
    });
  });

  // Performance mode
  const perfModeSelect = document.getElementById('performanceMode');
  perfModeSelect.addEventListener('change', (e) => {
    engine.setPerformanceMode(e.target.value);
    // Show/hide arp settings
    const arpSettings = document.getElementById('arpSettings');
    if (e.target.value === 'arp' || e.target.value === 'arp2oct') {
      arpSettings.classList.add('visible');
    } else {
      arpSettings.classList.remove('visible');
    }
  });

  // Key mode and quantization
  const updateKeySettings = () => {
    const root = parseInt(document.getElementById('keyRoot').value);
    const scale = document.getElementById('keyScale').value;
    const keyModeEnabled = document.getElementById('keyModeEnabled').checked;
    const quantizeEnabled = document.getElementById('quantizeEnabled').checked;

    engine.setKeyMode(keyModeEnabled, root, scale);
    engine.setQuantize(quantizeEnabled, root, scale);
  };

  document.getElementById('keyModeEnabled').addEventListener('change', updateKeySettings);
  document.getElementById('quantizeEnabled').addEventListener('change', updateKeySettings);
  document.getElementById('keyRoot').addEventListener('change', updateKeySettings);
  document.getElementById('keyScale').addEventListener('change', updateKeySettings);

  // Dials
  const voicingDial = document.getElementById('voicingDial');
  voicingDial.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    engine.setVoicingDirect(val);
    document.getElementById('voicingValue').textContent = val;
  });

  const bassDial = document.getElementById('bassDial');
  bassDial.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    engine.setBassOctave(val);
    document.getElementById('bassValue').textContent = val;
  });

  const performanceDial = document.getElementById('performanceDial');
  performanceDial.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    engine.setPerformanceDial(val);
    document.getElementById('performanceValue').textContent = val;
  });

  const bpmDial = document.getElementById('bpmDial');
  bpmDial.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    engine.setBpm(val);
    document.getElementById('bpmValue').textContent = val;
  });

  // Arp settings
  document.getElementById('arpPattern').addEventListener('change', (e) => {
    engine.setArpPattern(e.target.value);
  });

  document.getElementById('arpDivision').addEventListener('change', (e) => {
    engine.setArpDivision(e.target.value);
  });

  // Suppress root option
  document.getElementById('suppressRoot').addEventListener('change', (e) => {
    engine.setSuppressRoot(e.target.checked);
  });

  // Split keyboard controls
  const splitEnabled = document.getElementById('splitEnabled');
  const splitControls = document.getElementById('splitControls');
  const zonePanels = document.getElementById('zonePanels');
  const globalControls = document.getElementById('globalControls');

  splitEnabled.addEventListener('change', (e) => {
    engine.state.split.enabled = e.target.checked;
    if (e.target.checked) {
      splitControls.classList.add('visible');
      zonePanels.classList.add('visible');
      globalControls.style.display = 'none';
    } else {
      splitControls.classList.remove('visible');
      zonePanels.classList.remove('visible');
      globalControls.style.display = '';
    }
  });

  document.getElementById('splitPoint').addEventListener('change', (e) => {
    engine.state.split.point = parseInt(e.target.value);
  });

  // Global mode (when split disabled)
  document.getElementById('globalMode').addEventListener('change', (e) => {
    engine.state.globalMode = e.target.value;
  });

  // Lower zone controls
  const lowerZoneMode = document.getElementById('lowerZoneMode');
  const lowerChordSettings = document.getElementById('lowerChordSettings');

  lowerZoneMode.addEventListener('change', (e) => {
    engine.state.split.lower.mode = e.target.value;
    // Show settings for both chord and quantize modes
    lowerChordSettings.style.display = (e.target.value === 'chord' || e.target.value === 'quantize') ? 'block' : 'none';
  });

  document.getElementById('lowerChordType').addEventListener('change', (e) => {
    engine.state.split.lower.chordType = e.target.value;
  });

  document.querySelectorAll('input[name="lowerPlaystyle"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      engine.state.split.lower.playstyle = e.target.value;
    });
  });

  document.getElementById('lowerPerformanceMode').addEventListener('change', (e) => {
    engine.state.split.lower.performanceMode = e.target.value;
  });

  const updateLowerKeySettings = () => {
    const root = parseInt(document.getElementById('lowerKeyRoot').value);
    const scale = document.getElementById('lowerKeyScale').value;
    const keyModeEnabled = document.getElementById('lowerKeyModeEnabled').checked;
    const quantizeEnabled = document.getElementById('lowerQuantizeEnabled').checked;

    engine.state.split.lower.keyMode = { enabled: keyModeEnabled, root, scale };
    engine.state.split.lower.quantize = { enabled: quantizeEnabled, root, scale };
  };

  document.getElementById('lowerKeyModeEnabled').addEventListener('change', updateLowerKeySettings);
  document.getElementById('lowerQuantizeEnabled').addEventListener('change', updateLowerKeySettings);
  document.getElementById('lowerKeyRoot').addEventListener('change', updateLowerKeySettings);
  document.getElementById('lowerKeyScale').addEventListener('change', updateLowerKeySettings);

  // Upper zone controls
  const upperZoneMode = document.getElementById('upperZoneMode');
  const upperChordSettings = document.getElementById('upperChordSettings');

  upperZoneMode.addEventListener('change', (e) => {
    engine.state.split.upper.mode = e.target.value;
    // Show settings for both chord and quantize modes
    upperChordSettings.style.display = (e.target.value === 'chord' || e.target.value === 'quantize') ? 'block' : 'none';
  });

  document.getElementById('upperChordType').addEventListener('change', (e) => {
    engine.state.split.upper.chordType = e.target.value;
  });

  document.querySelectorAll('input[name="upperPlaystyle"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      engine.state.split.upper.playstyle = e.target.value;
    });
  });

  document.getElementById('upperPerformanceMode').addEventListener('change', (e) => {
    engine.state.split.upper.performanceMode = e.target.value;
  });

  const updateUpperKeySettings = () => {
    const root = parseInt(document.getElementById('upperKeyRoot').value);
    const scale = document.getElementById('upperKeyScale').value;
    const keyModeEnabled = document.getElementById('upperKeyModeEnabled').checked;
    const quantizeEnabled = document.getElementById('upperQuantizeEnabled').checked;

    engine.state.split.upper.keyMode = { enabled: keyModeEnabled, root, scale };
    engine.state.split.upper.quantize = { enabled: quantizeEnabled, root, scale };
  };

  document.getElementById('upperKeyModeEnabled').addEventListener('change', updateUpperKeySettings);
  document.getElementById('upperQuantizeEnabled').addEventListener('change', updateUpperKeySettings);
  document.getElementById('upperKeyRoot').addEventListener('change', updateUpperKeySettings);
  document.getElementById('upperKeyScale').addEventListener('change', updateUpperKeySettings);

  // MIDI input selection
  document.getElementById('midiInput').addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index) && midiInputs[index]) {
      engine.selectMIDIInput(midiInputs[index]);
      updateMIDIStatus(true, `In: ${midiInputs[index].name}`);
    } else {
      engine.selectMIDIInput(null);
    }
  });

  // MIDI output selection
  document.getElementById('midiOutput').addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index) && midiOutputs[index]) {
      engine.selectMIDIOutput(midiOutputs[index]);
      updateMIDIStatus(true, `Out: ${midiOutputs[index].name}`);
    }
  });

  document.getElementById('connectMidi').addEventListener('click', async () => {
    try {
      const midiDevices = await engine.init();
      midiInputs = midiDevices.inputs || [];
      midiOutputs = midiDevices.outputs || [];
      updateMIDISelects();
    } catch (e) {
      alert('MIDI not available: ' + e.message);
    }
  });
}

function updateMIDIStatus(connected, name = '') {
  const status = document.getElementById('midiStatus');
  const text = status.querySelector('.status-text');

  if (connected) {
    status.classList.add('connected');
    text.textContent = `Connected: ${name}`;
  } else {
    status.classList.remove('connected');
    text.textContent = 'MIDI Not Connected';
  }
}

function setupKeyboardInput() {
  const activeKeys = new Set();

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    const key = e.key.toLowerCase();

    // Chord type shortcuts (1-4)
    if (key >= '1' && key <= '4') {
      const chordTypes = ['Maj', 'Min', 'Sus', 'Dim'];
      const index = parseInt(key) - 1;
      const btn = document.querySelector(`.chord-btn[data-chord="${chordTypes[index]}"]`);
      if (btn) {
        document.querySelectorAll('.chord-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        engine.onChordType(chordTypes[index], true);
      }
      return;
    }

    // Extension shortcuts (5-8)
    if (key >= '5' && key <= '8') {
      const exts = ['6', 'm7', 'M7', '9'];
      const index = parseInt(key) - 5;
      const btn = document.querySelector(`.ext-btn[data-ext="${exts[index]}"]`);
      if (btn && !btn.classList.contains('active')) {
        btn.classList.add('active');
        engine.onExtension(exts[index], true);
      }
      return;
    }

    // Note keys
    if (KEYBOARD_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
      activeKeys.add(key);
      const note = KEYBOARD_MAP[key];

      // Highlight input key
      engine.highlightInputKey(note % 12, true);

      engine.onKeyDown(note);
    }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    // Chord type release (1-4)
    if (key >= '1' && key <= '4') {
      const chordTypes = ['Maj', 'Min', 'Sus', 'Dim'];
      const index = parseInt(key) - 1;
      if (engine.state.playstyle === 'free') {
        const btn = document.querySelector(`.chord-btn[data-chord="${chordTypes[index]}"]`);
        if (btn) btn.classList.remove('active');
      }
      engine.onChordType(chordTypes[index], false);
      return;
    }

    // Extension release (5-8)
    if (key >= '5' && key <= '8') {
      const exts = ['6', 'm7', 'M7', '9'];
      const index = parseInt(key) - 5;
      const btn = document.querySelector(`.ext-btn[data-ext="${exts[index]}"]`);
      if (btn) btn.classList.remove('active');
      engine.onExtension(exts[index], false);
      return;
    }

    // Note keys
    if (KEYBOARD_MAP.hasOwnProperty(key)) {
      activeKeys.delete(key);
      const note = KEYBOARD_MAP[key];

      // Remove input highlight
      engine.highlightInputKey(note % 12, false);

      engine.onKeyUp(note);
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);
