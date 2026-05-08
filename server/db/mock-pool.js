// Mock database pool for development without PostgreSQL
const mockData = {
  schools: [
    { id: 1, name: "St. Mary's Academy", school_code: 'SCH-001', level: 'elementary', division: 'Division of Pasig' },
    { id: 2, name: 'Holy Cross Kindergarten', school_code: 'SCH-002', level: 'kindergarten', division: 'Division of Pasig' },
    { id: 3, name: 'Lourdes Academy', school_code: 'SCH-003', level: 'junior', division: 'Division of Pasig' },
    { id: 4, name: 'Immaculate Conception', school_code: 'SCH-004', level: 'senior', division: 'Division of Pasig' },
    { id: 5, name: 'San Jose Academy', school_code: 'SCH-005', level: 'elementary', division: 'Division of Pasig' },
    { id: 6, name: 'Sacred Heart School', school_code: 'SCH-006', level: 'elementary', division: 'Division of Pasig' },
    { id: 7, name: 'Little Flower Kinder', school_code: 'SCH-007', level: 'kindergarten', division: 'Division of Pasig' },
    { id: 8, name: 'St. Joseph High School', school_code: 'SCH-008', level: 'junior', division: 'Division of Pasig' }
  ],
  staff: [],
  admins: [
    { id: 1, username: 'admin', full_name: 'Division Administrator', position: 'Education Program Supervisor', division: 'Division of Pasig', email: 'admin@deped-pasig.gov.ph', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IY4J.y5j7OWg6K8WQV3cLyOv4Zj6qK' } // admin123
  ]
};

class MockPool {
  async query(text, params) {
    console.log('Mock Query:', text, params);
    
    // Handle different query types
    if (text.includes('SELECT') && text.includes('schools')) {
      return { rows: mockData.schools };
    }
    
    if (text.includes('SELECT') && text.includes('staff') && text.includes('email')) {
      const [email, schoolId] = params;
      const staff = mockData.staff.find(s => s.email === email && s.school_id == schoolId);
      return { rows: staff ? [staff] : [] };
    }
    
    if (text.includes('SELECT') && text.includes('staff') && text.includes('JOIN')) {
      const [email, schoolId] = params;
      const staff = mockData.staff.find(s => s.email === email && s.school_id == schoolId);
      if (staff) {
        const school = mockData.schools.find(s => s.id === staff.school_id);
        return { rows: [{ ...staff, school_name: school.name, school_level: school.level, school_code: school.school_code, division: school.division }] };
      }
      return { rows: [] };
    }
    
    if (text.includes('SELECT') && text.includes('admins')) {
      const [username] = params;
      const admin = mockData.admins.find(a => a.username === username);
      return { rows: admin ? [admin] : [] };
    }
    
    if (text.includes('INSERT') && text.includes('staff')) {
      const [schoolId, firstName, lastName, position, email, password, status] = params;
      const newStaff = {
        id: mockData.staff.length + 1,
        school_id: parseInt(schoolId),
        first_name: firstName,
        last_name: lastName,
        position: position,
        email: email,
        password: password,
        status: status || 'pending',
        created_at: new Date().toISOString()
      };
      mockData.staff.push(newStaff);
      return { rows: [newStaff] };
    }
    
    // Default empty result
    return { rows: [] };
  }
  
  async connect() {
    return {
      query: this.query.bind(this),
      release: () => {}
    };
  }
  
  on(event, callback) {
    if (event === 'error') {
      // Mock error handling
    }
  }
  
  async end() {
    // Mock cleanup
  }
}

module.exports = new MockPool();
