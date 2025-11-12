export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  yearOfStudy: string;
  location: GeolocationCoordinates | null;
  isInsideBoundary: boolean;
  isRealUser: boolean; // Differentiates the logged-in student from mock students
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeofencePoint {
  lat: number;
  lng: number;
}

export interface Alert {
  id: string;
  studentName: string;
  studentId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export enum AppView {
  Login,
  UserSelection,
  StudentIdScan,
  LocationAccess,
  AdminKey,
  AdminDashboard,
  EditBoundary,
}
