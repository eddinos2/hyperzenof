export interface ReferenceData {
  filieres: string[];
  campus: string[];
  horaires: string[];
  mois: string[];
  classes: string[];
  retards: string[];
  cours: string[];
}

export const parseReferenceDataCSV = (csvText: string): ReferenceData => {
  const lines = csvText.split('\n');
  
  const filieres = new Set<string>();
  const campus = new Set<string>();
  const horaires = new Set<string>();
  const mois = new Set<string>();
  const classes = new Set<string>();
  const retards = new Set<string>();
  const cours = new Set<string>();

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');
    
    // FILIERE (column 0)
    if (columns[0] && columns[0].trim()) {
      filieres.add(columns[0].trim());
    }
    
    // CAMPUS (column 1)
    if (columns[1] && columns[1].trim()) {
      campus.add(columns[1].trim());
    }
    
    // HORAIRE (columns 2 and 3)
    if (columns[2] && columns[2].trim()) {
      horaires.add(columns[2].trim());
    }
    if (columns[3] && columns[3].trim()) {
      horaires.add(columns[3].trim());
    }
    
    // MOIS (column 4)
    if (columns[4] && columns[4].trim()) {
      mois.add(columns[4].trim());
    }
    
    // CLASSE (column 5)
    if (columns[5] && columns[5].trim()) {
      classes.add(columns[5].trim());
    }
    
    // RETARD (column 9)
    if (columns[9] && columns[9].trim()) {
      retards.add(columns[9].trim());
    }
    
    // COURS (column 10)
    if (columns[10] && columns[10].trim()) {
      cours.add(columns[10].trim());
    }
  }

  return {
    filieres: Array.from(filieres).sort(),
    campus: Array.from(campus).sort(),
    horaires: Array.from(horaires).sort(),
    mois: ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'],
    classes: Array.from(classes).sort(),
    retards: ['Aucun', '0-15 min.', '16-30 min.'],
    cours: Array.from(cours).sort(),
  };
};

export const loadReferenceData = async (): Promise<ReferenceData> => {
  try {
    const response = await fetch('/reference_data_menu.csv');
    const csvText = await response.text();
    return parseReferenceDataCSV(csvText);
  } catch (error) {
    console.error('Error loading reference data:', error);
    return {
      filieres: [],
      campus: [],
      horaires: [],
      mois: ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'],
      classes: [],
      retards: ['Aucun', '0-15 min.', '16-30 min.'],
      cours: [],
    };
  }
};
