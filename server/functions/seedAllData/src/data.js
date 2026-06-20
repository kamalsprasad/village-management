// Static seed data — imported by main.js

export const SAMPLE_HOUSEHOLDS = [
  { name: 'Banda Family Home', household_type: 'Single Family', construction_date: '2019-06-15', bedrooms: 3, bathrooms: 1, notes: 'Main family residence near the village center.' },
  { name: 'Phiri Family Home', household_type: 'Single Family', construction_date: '2020-02-20', bedrooms: 4, bathrooms: 2, notes: 'Two-story home with garden area.' },
  { name: 'Mwale Extended Family Compound', household_type: 'Multi-Family', construction_date: '2018-11-10', bedrooms: 6, bathrooms: 3, notes: 'Large compound housing multiple generations.' },
  { name: 'Staff Quarters', household_type: 'Dormitory', construction_date: '2021-01-05', bedrooms: 8, bathrooms: 4, notes: 'Housing for village staff and workers.' },
  { name: 'Village Administration Office', household_type: 'Admin Building', construction_date: '2019-09-01', bedrooms: 0, bathrooms: 2, notes: 'Administrative building.' },
  { name: 'Visitor Accommodation', household_type: 'Guest House', construction_date: '2021-08-20', bedrooms: 4, bathrooms: 2, notes: 'Guest house for visitors.' },
  { name: 'Mumba Family Home', household_type: 'Single Family', construction_date: '2022-03-10', bedrooms: 3, bathrooms: 1, notes: 'Home of the Mumba family.' },
  { name: 'Mwamba Family Home', household_type: 'Single Family', construction_date: '2022-07-18', bedrooms: 3, bathrooms: 1, notes: 'Home of the Mwamba family.' },
];

// Each entry: { first_name, last_name, dob, gender, householdIndex, ...optional }
export const SAMPLE_RESIDENTS = [
  // Banda (0)
  { first_name:'Joseph', middle_names:'Chanda', last_name:'Banda', dob:'1965-03-12', gender:'Male', householdIndex:0, phone:'+260971234567', notes:'Village Head.', isCouncilMember:true, councilRole:'Village Head' },
  { first_name:'Mary', middle_names:'Nkandu', last_name:'Banda', dob:'1970-07-22', gender:'Female', householdIndex:0, notes:"Joseph's wife." },
  { first_name:'Grace', middle_names:'', last_name:'Banda', dob:'1995-11-08', gender:'Female', householdIndex:0, notes:'Primary school teacher.' },
  { first_name:'Peter', middle_names:'Mumba', last_name:'Banda', dob:'2005-04-15', gender:'Male', householdIndex:0, notes:'Secondary school.' },
  { first_name:'Lucy', middle_names:'', last_name:'Banda', dob:'2016-09-20', gender:'Female', householdIndex:0, notes:'Primary school student.' },
  { first_name:'Thomas', middle_names:'Mumba', last_name:'Banda', dob:'2012-01-10', gender:'Male', householdIndex:0, notes:'Junior secondary student.' },
  { first_name:'Sophia', middle_names:'', last_name:'Banda', dob:'2009-12-01', gender:'Female', householdIndex:0, notes:'Senior secondary student.' },
  // Phiri (1)
  { first_name:'Emmanuel', middle_names:'Tembo', last_name:'Phiri', dob:'1972-09-30', gender:'Male', householdIndex:1, phone:'+260972345678', notes:'Deputy Village Head.', isCouncilMember:true, councilRole:'Deputy Village Head' },
  { first_name:'Ruth', middle_names:'Mwila', last_name:'Phiri', dob:'1978-01-14', gender:'Female', householdIndex:1, notes:"Emmanuel's wife." },
  { first_name:'David', middle_names:'', last_name:'Phiri', dob:'2000-06-25', gender:'Male', householdIndex:1, notes:'University student.' },
  { first_name:'Sarah', middle_names:'Chipo', last_name:'Phiri', dob:'2008-12-03', gender:'Female', householdIndex:1, notes:'Primary school student.' },
  { first_name:'Esther', middle_names:'Mwila', last_name:'Phiri', dob:'2015-05-30', gender:'Female', householdIndex:1, notes:'Primary school student.' },
  { first_name:'Joshua', middle_names:'', last_name:'Phiri', dob:'2013-08-14', gender:'Male', householdIndex:1, notes:'Junior secondary student.' },
  { first_name:'Daniel', middle_names:'Tembo', last_name:'Phiri', dob:'2021-09-15', gender:'Male', householdIndex:1, notes:'Early childhood.' },
  // Mwale (2)
  { first_name:'James', middle_names:'Bwalya', last_name:'Mwale', dob:'1968-05-18', gender:'Male', householdIndex:2, phone:'+260973456789', notes:'Finance Manager.', isCouncilMember:true, councilRole:'Finance Manager' },
  { first_name:'Elizabeth', middle_names:'Mutale', last_name:'Mwale', dob:'1975-08-07', gender:'Female', householdIndex:2, notes:"James's wife." },
  { first_name:'John', middle_names:'', last_name:'Mwale', dob:'1998-02-28', gender:'Male', householdIndex:2, notes:'Village maintenance.' },
  { first_name:'Martha', middle_names:'Kasonde', last_name:'Mwale', dob:'2002-10-11', gender:'Female', householdIndex:2, notes:'Vocational training.' },
  { first_name:'Paul', middle_names:'Chilufya', last_name:'Mwale', dob:'2010-07-19', gender:'Male', householdIndex:2, notes:'Primary school student.' },
  { first_name:'Catherine', middle_names:'', last_name:'Mwale', dob:'2014-11-22', gender:'Female', householdIndex:2, notes:'Primary school student.' },
  { first_name:'Michael', middle_names:'Bwalya', last_name:'Mwale', dob:'2011-03-05', gender:'Male', householdIndex:2, notes:'Junior secondary student.' },
  { first_name:'Margaret', middle_names:'', last_name:'Mwale', dob:'2007-08-20', gender:'Female', householdIndex:2, notes:'Final year secondary.' },
  // Tembo (3)
  { first_name:'Michael', middle_names:'Zulu', last_name:'Tembo', dob:'1985-04-02', gender:'Male', householdIndex:3, room_number:'Room 1', notes:'Village security coordinator.' },
  { first_name:'Rebecca', middle_names:'', last_name:'Tembo', dob:'1988-11-25', gender:'Female', householdIndex:3, room_number:'Room 1', notes:'Kitchen staff.' },
  { first_name:'Joseph', middle_names:'', last_name:'Tembo', dob:'2019-06-18', gender:'Male', householdIndex:3, room_number:'Room 1', notes:'Starting primary school.' },
  { first_name:'Faith', middle_names:'Zulu', last_name:'Tembo', dob:'2020-02-11', gender:'Female', householdIndex:3, room_number:'Room 1', notes:'Early childhood.' },
  // Zulu (3)
  { first_name:'Daniel', middle_names:'Mulenga', last_name:'Zulu', dob:'1990-01-30', gender:'Male', householdIndex:3, room_number:'Room 3', notes:'Farm supervisor.' },
  { first_name:'Esther', middle_names:'Nachilima', last_name:'Zulu', dob:'1992-06-14', gender:'Female', householdIndex:3, room_number:'Room 3', notes:"Daniel's wife." },
  { first_name:'Samuel', middle_names:'', last_name:'Zulu', dob:'2018-03-08', gender:'Male', householdIndex:3, room_number:'Room 3', notes:'Young child.' },
  { first_name:'Blessing', middle_names:'', last_name:'Zulu', dob:'2017-04-03', gender:'Female', householdIndex:3, room_number:'Room 3', notes:'Primary school student.' },
  { first_name:'Abel', middle_names:'Mulenga', last_name:'Zulu', dob:'2022-07-25', gender:'Male', householdIndex:3, room_number:'Room 3', notes:'Early childhood.' },
  // Mulenga (5)
  { first_name:'Andrew', middle_names:'Kapembwa', last_name:'Mulenga', dob:'1982-12-05', gender:'Male', householdIndex:5, room_number:'Room 2', notes:'Visiting agricultural consultant.' },
  { first_name:'Priscilla', middle_names:'Monde', last_name:'Mulenga', dob:'1986-09-17', gender:'Female', householdIndex:5, room_number:'Room 2', notes:"Andrew's wife. Visiting nurse." },
  // Mumba (6)
  { first_name:'Nkosi', middle_names:'Chanda', last_name:'Mumba', dob:'1984-06-12', gender:'Male', householdIndex:6, phone:'+260977001001', notes:'Mathematics teacher Gr6-9.' },
  { first_name:'Agnes', middle_names:'Nkandu', last_name:'Mumba', dob:'1987-03-25', gender:'Female', householdIndex:6, notes:"Nkosi's wife." },
  { first_name:'Lilian', middle_names:'', last_name:'Zulu', dob:'1989-09-04', gender:'Female', householdIndex:6, notes:'English teacher Gr6-9.' },
  { first_name:'Natasha', middle_names:'', last_name:'Mumba', dob:'2021-11-18', gender:'Female', householdIndex:6, notes:'Early childhood.' },
  // Mwamba (7)
  { first_name:'Chanda', middle_names:'Bwalya', last_name:'Mwamba', dob:'1979-02-14', gender:'Male', householdIndex:7, phone:'+260977004004', notes:'Mathematics teacher Gr10-12.' },
  { first_name:'Agnes', middle_names:'Chilufya', last_name:'Phiri', dob:'1983-07-09', gender:'Female', householdIndex:7, notes:'English teacher Gr10-12.' },
  { first_name:'Bernard', middle_names:'', last_name:'Kapata', dob:'1988-04-20', gender:'Male', householdIndex:7, phone:'+260977002002', notes:'Village carpenter.' },
  { first_name:'Grace', middle_names:'Monde', last_name:'Kapata', dob:'1991-10-05', gender:'Female', householdIndex:7, notes:"Bernard's wife." },
  { first_name:'Isaac', middle_names:'', last_name:'Kapata', dob:'2021-08-14', gender:'Male', householdIndex:7, notes:'Early childhood.' },
  { first_name:'Moses', middle_names:'', last_name:'Kapata', dob:'2018-05-22', gender:'Male', householdIndex:7, notes:'Grade 2 learner.' },
  // Extra Banda (0)
  { first_name:'Chisomo', middle_names:'', last_name:'Banda', dob:'2019-04-12', gender:'Female', householdIndex:0, notes:'Grade 1.' },
  { first_name:'Elijah', middle_names:'', last_name:'Banda', dob:'2017-02-28', gender:'Male', householdIndex:0, notes:'Grade 3.' },
  { first_name:'Levi', middle_names:'', last_name:'Banda', dob:'2015-09-10', gender:'Male', householdIndex:0, notes:'Grade 4.' },
  { first_name:'Emmanuel', middle_names:'', last_name:'Banda', dob:'2013-11-20', gender:'Male', householdIndex:0, notes:'Grade 6.' },
  { first_name:'Philip', middle_names:'', last_name:'Banda', dob:'2011-07-15', gender:'Male', householdIndex:0, notes:'Grade 7.' },
  { first_name:'Naomi', middle_names:'', last_name:'Banda', dob:'2010-03-08', gender:'Female', householdIndex:0, notes:'Grade 8.' },
  { first_name:'Zoe', middle_names:'', last_name:'Banda', dob:'2008-06-14', gender:'Female', householdIndex:0, notes:'Grade 10.' },
  // Extra Phiri (1)
  { first_name:'Abigail', middle_names:'', last_name:'Phiri', dob:'2010-11-15', gender:'Female', householdIndex:1, notes:'Grade 8.' },
  { first_name:'Thandeka', middle_names:'', last_name:'Phiri', dob:'2019-07-03', gender:'Female', householdIndex:1, notes:'Grade 1.' },
  { first_name:'Rachel', middle_names:'', last_name:'Phiri', dob:'2017-09-19', gender:'Female', householdIndex:1, notes:'Grade 3.' },
  { first_name:'Aaron', middle_names:'', last_name:'Phiri', dob:'2014-12-07', gender:'Male', householdIndex:1, notes:'Grade 5.' },
  { first_name:'Lydia', middle_names:'', last_name:'Phiri', dob:'2013-05-24', gender:'Female', householdIndex:1, notes:'Grade 6.' },
  { first_name:'Jonathan', middle_names:'', last_name:'Phiri', dob:'2011-02-17', gender:'Male', householdIndex:1, notes:'Grade 9.' },
  { first_name:'Isaiah', middle_names:'', last_name:'Phiri', dob:'2009-08-11', gender:'Male', householdIndex:1, notes:'Grade 10.' },
  { first_name:'Dorcas', middle_names:'', last_name:'Phiri', dob:'2007-01-30', gender:'Female', householdIndex:1, notes:'Grade 12.' },
  // Extra Mwale (2)
  { first_name:'Caleb', middle_names:'', last_name:'Mwale', dob:'2017-06-05', gender:'Male', householdIndex:2, notes:'Grade 3.' },
  { first_name:'Hannah', middle_names:'', last_name:'Mwale', dob:'2015-04-18', gender:'Female', householdIndex:2, notes:'Grade 4.' },
  { first_name:'Miriam', middle_names:'', last_name:'Mwale', dob:'2014-01-09', gender:'Female', householdIndex:2, notes:'Grade 5.' },
  { first_name:'Deborah', middle_names:'', last_name:'Mwale', dob:'2012-09-26', gender:'Female', householdIndex:2, notes:'Grade 7.' },
  { first_name:'Rebecca', middle_names:'', last_name:'Mwale', dob:'2011-05-14', gender:'Female', householdIndex:2, notes:'Grade 9.' },
  { first_name:'Cornelius', middle_names:'', last_name:'Mwale', dob:'2008-11-03', gender:'Male', householdIndex:2, notes:'Grade 11.' },
  // Extra Tembo (3)
  { first_name:'Naomi', middle_names:'', last_name:'Tembo', dob:'2018-08-25', gender:'Female', householdIndex:3, room_number:'Room 1', notes:'Grade 2.' },
  { first_name:'Joy', middle_names:'', last_name:'Tembo', dob:'2015-03-16', gender:'Female', householdIndex:3, room_number:'Room 1', notes:'Grade 4.' },
  { first_name:'Daniel', middle_names:'', last_name:'Tembo', dob:'2010-10-28', gender:'Male', householdIndex:3, room_number:'Room 1', notes:'Grade 8.' },
  { first_name:'Eunice', middle_names:'', last_name:'Tembo', dob:'2009-04-01', gender:'Female', householdIndex:3, room_number:'Room 1', notes:'Grade 10.' },
  { first_name:'Tobias', middle_names:'', last_name:'Tembo', dob:'2007-07-20', gender:'Male', householdIndex:3, room_number:'Room 1', notes:'Grade 12.' },
  // Extra Zulu (3)
  { first_name:'Priscah', middle_names:'', last_name:'Zulu', dob:'2018-01-30', gender:'Female', householdIndex:3, room_number:'Room 3', notes:'Grade 2.' },
  { first_name:'Simon', middle_names:'', last_name:'Zulu', dob:'2014-11-12', gender:'Male', householdIndex:3, room_number:'Room 3', notes:'Grade 5.' },
  { first_name:'Nathan', middle_names:'', last_name:'Zulu', dob:'2013-08-04', gender:'Male', householdIndex:3, room_number:'Room 3', notes:'Grade 6.' },
  { first_name:'Ruth', middle_names:'', last_name:'Zulu', dob:'2012-05-19', gender:'Female', householdIndex:3, room_number:'Room 3', notes:'Grade 7.' },
  { first_name:'Leah', middle_names:'', last_name:'Zulu', dob:'2011-02-06', gender:'Female', householdIndex:3, room_number:'Room 3', notes:'Grade 9.' },
  { first_name:'Gloria', middle_names:'', last_name:'Zulu', dob:'2008-09-22', gender:'Female', householdIndex:3, room_number:'Room 3', notes:'Grade 11.' },
];

export const TIMETABLE_SCHEDULE = {
  'Early Childhood':[['Local Language','Mathematics','Creative and Technology Studies','Local Language','Mathematics','Creative and Technology Studies'],['Mathematics','Local Language','Creative and Technology Studies','Mathematics','Local Language','Creative and Technology Studies'],['Creative and Technology Studies','Mathematics','Local Language','Creative and Technology Studies','Mathematics','Local Language'],['Local Language','Creative and Technology Studies','Mathematics','Local Language','Creative and Technology Studies','Mathematics'],['Mathematics','Local Language','Creative and Technology Studies','Mathematics','Local Language','Creative and Technology Studies']],
  'Grade 1':[['Mathematics','English','Local Language','Mathematics','English','Local Language'],['English','Mathematics','Local Language','English','Mathematics','Local Language'],['Local Language','Mathematics','English','Local Language','Mathematics','English'],['Mathematics','Local Language','English','Mathematics','Local Language','English'],['English','Local Language','Mathematics','English','Local Language','Mathematics']],
  'Grade 2':[['Mathematics','English','Local Language','Mathematics','English','Local Language'],['English','Mathematics','Local Language','English','Mathematics','Local Language'],['Local Language','English','Mathematics','Local Language','English','Mathematics'],['Mathematics','Local Language','English','Mathematics','Local Language','English'],['English','Local Language','Mathematics','English','Local Language','Mathematics']],
  'Grade 3':[['Mathematics','English','Integrated Science','Local Language','Creative and Technology Studies','Social Studies'],['English','Mathematics','Social Studies','Integrated Science','Local Language','Creative and Technology Studies'],['Integrated Science','Local Language','Mathematics','English','Social Studies','Creative and Technology Studies'],['Mathematics','Integrated Science','English','Social Studies','Local Language','Creative and Technology Studies'],['English','Social Studies','Mathematics','Integrated Science','Creative and Technology Studies','Local Language']],
  'Grade 4':[['Mathematics','English','Integrated Science','Social Studies','Local Language','Creative and Technology Studies'],['English','Mathematics','Social Studies','Integrated Science','Creative and Technology Studies','Local Language'],['Integrated Science','Local Language','Mathematics','English','Social Studies','Creative and Technology Studies'],['Mathematics','Social Studies','English','Integrated Science','Creative and Technology Studies','Local Language'],['English','Integrated Science','Social Studies','Mathematics','Local Language','Creative and Technology Studies']],
  'Grade 5':[['Mathematics','English','Integrated Science','Social Studies','Local Language','Creative and Technology Studies'],['English','Mathematics','Social Studies','Integrated Science','Creative and Technology Studies','Local Language'],['Integrated Science','Social Studies','Mathematics','English','Local Language','Creative and Technology Studies'],['Mathematics','Integrated Science','English','Social Studies','Creative and Technology Studies','Local Language'],['English','Social Studies','Mathematics','Integrated Science','Local Language','Creative and Technology Studies']],
  'Grade 6':[['Mathematics','English','Integrated Science','Social Studies','Agriculture Science','Local Language'],['English','Mathematics','Social Studies','Integrated Science','Local Language','Creative and Technology Studies'],['Integrated Science','Agriculture Science','Mathematics','English','Geography','Creative and Technology Studies'],['Mathematics','Social Studies','English','Agriculture Science','Local Language','Geography'],['English','Integrated Science','Agriculture Science','Mathematics','Creative and Technology Studies','Social Studies']],
  'Grade 7':[['Mathematics','English','Integrated Science','Social Studies','Agriculture Science','Local Language'],['English','Mathematics','Social Studies','Integrated Science','Geography','Creative and Technology Studies'],['Integrated Science','Agriculture Science','Mathematics','English','Local Language','Geography'],['Mathematics','Social Studies','English','Agriculture Science','Creative and Technology Studies','Integrated Science'],['English','Geography','Mathematics','Integrated Science','Local Language','Agriculture Science']],
  'Grade 8':[['Mathematics','English','Integrated Science','Social Studies','Business Studies','Local Language'],['English','Mathematics','Business Studies','Integrated Science','Geography','Creative and Technology Studies'],['Integrated Science','Business Studies','Mathematics','English','Local Language','Geography'],['Mathematics','Social Studies','English','Business Studies','Creative and Technology Studies','Integrated Science'],['English','Geography','Mathematics','Integrated Science','Local Language','Business Studies']],
  'Grade 9':[['Mathematics','English','Biology','Chemistry','Agriculture Science','Civic Education'],['English','Mathematics','Chemistry','Biology','Geography','Local Language'],['Biology','Agriculture Science','Mathematics','English','Civic Education','Geography'],['Mathematics','Chemistry','English','Agriculture Science','Local Language','Biology'],['English','Biology','Chemistry','Mathematics','Civic Education','Agriculture Science']],
  'Grade 10':[['Mathematics','English','Biology','Chemistry','Physics','Business Studies'],['English','Mathematics','Chemistry','Biology','Geography','Civic Education'],['Biology','Physics','Mathematics','English','Business Studies','Local Language'],['Mathematics','Chemistry','English','Physics','Civic Education','Biology'],['English','Biology','Business Studies','Mathematics','Local Language','Chemistry']],
  'Grade 11':[['Mathematics','English','Biology','Chemistry','Physics','Business Studies'],['English','Mathematics','Chemistry','Biology','Business Studies','Local Language'],['Biology','Physics','Mathematics','English','Chemistry','Local Language'],['Mathematics','Chemistry','English','Physics','Biology','Business Studies'],['English','Biology','Physics','Mathematics','Business Studies','Local Language']],
  'Grade 12':[['Mathematics','English','Biology','Chemistry','Physics','Business Studies'],['English','Mathematics','Chemistry','Biology','Business Studies','Local Language'],['Biology','Physics','Mathematics','English','Chemistry','Local Language'],['Mathematics','Chemistry','English','Physics','Biology','Business Studies'],['English','Biology','Physics','Mathematics','Business Studies','Local Language']],
};
