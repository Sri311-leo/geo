import React, { useState, useEffect, useCallback } from 'react';
import { AppView, Student, GeofencePoint, Alert, GeolocationCoordinates } from './types';
import LoginPage from './components/LoginPage';
import UserSelectionPage from './components/UserSelectionPage';
import StudentIdScanPage from './components/StudentIdScanPage';
import LocationAccessPage from './components/LocationAccessPage';
import AdminKeyPage from './components/AdminKeyPage';
import AdminDashboard from './components/AdminDashboard';
import EditBoundaryPage from './components/EditBoundaryPage';

const MOCK_STUDENTS: Student[] = [
  { id: 'mock-1', name: 'Alice Johnson', rollNumber: 'M001', department: 'CompSci', yearOfStudy: '3', location: { latitude: 50, longitude: 55 }, isInsideBoundary: true, isRealUser: false },
  { id: 'mock-2', name: 'Bob Williams', rollNumber: 'M002', department: 'Physics', yearOfStudy: '2', location: { latitude: 70, longitude: 65 }, isInsideBoundary: true, isRealUser: false },
  { id: 'mock-3', name: 'Charlie Brown', rollNumber: 'M003', department: 'Chemistry', yearOfStudy: '4', location: { latitude: 20, longitude: 30 }, isInsideBoundary: true, isRealUser: false },
];

const INITIAL_BOUNDARY: GeofencePoint[] = [
    { lat: 10, lng: 10 },
    { lat: 90, lng: 10 },
    { lat: 90, lng: 90 },
    { lat: 10, lng: 90 },
];

// Point in Polygon check
const isPointInPolygon = (point: GeolocationCoordinates, polygon: GeofencePoint[]): boolean => {
    let isInside = false;
    const { latitude: x, longitude: y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const { lat: xi, lng: yi } = polygon[i];
        const { lat: xj, lng: yj } = polygon[j];

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

export default function App() {
    const [currentView, setCurrentView] = useState<AppView>(AppView.Login);
    const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
    const [boundary, setBoundary] = useState<GeofencePoint[]>(INITIAL_BOUNDARY);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [currentUser, setCurrentUser] = useState<Student | null>(null);

    const checkBoundaries = useCallback(() => {
        const now = new Date();
        // Check between 9:00 AM and 12:15 PM
        const isTrackingTime = now.getHours() >= 9 && (now.getHours() < 12 || (now.getHours() === 12 && now.getMinutes() <= 15));

        setStudents(prevStudents => {
            const newStudents = [...prevStudents];
            let newAlertsGenerated = false;
            
            newStudents.forEach(student => {
                if (student.location) {
                    const wasInside = student.isInsideBoundary;
                    const isInside = isPointInPolygon(student.location, boundary);
                    student.isInsideBoundary = isInside;

                    if (isTrackingTime && wasInside && !isInside) {
                        const existingAlert = alerts.find(a => a.studentId === student.id && !a.read);
                        if (!existingAlert) {
                            const newAlert: Alert = {
                                id: `alert-${Date.now()}-${student.id}`,
                                studentId: student.id,
                                studentName: student.name,
                                message: `${student.name} left the designated boundary.`,
                                timestamp: new Date(),
                                read: false,
                            };
                            setAlerts(prev => [newAlert, ...prev]);
                            newAlertsGenerated = true;
                        }
                    }
                }
            });

            if (newAlertsGenerated) {
                // Trigger a subtle UI feedback for new alert
                console.log("New boundary breach alert generated!");
            }
            return newStudents;
        });
    }, [boundary, alerts]);


    useEffect(() => {
        const moveMockStudents = () => {
            setStudents(prevStudents => prevStudents.map(s => {
                if (!s.isRealUser && s.location) {
                    const newLat = s.location.latitude + (Math.random() - 0.5) * 2;
                    const newLng = s.location.longitude + (Math.random() - 0.5) * 2;
                    return {
                        ...s,
                        location: {
                            latitude: Math.max(0, Math.min(100, newLat)),
                            longitude: Math.max(0, Math.min(100, newLng)),
                        }
                    };
                }
                return s;
            }));
        };

        const interval = setInterval(() => {
            moveMockStudents();
            checkBoundaries();
        }, 5000);

        return () => clearInterval(interval);
    }, [checkBoundaries]);
    
    const handleLogin = () => setCurrentView(AppView.UserSelection);
    const handleSelectUserType = (type: 'student' | 'admin') => {
        setCurrentView(type === 'student' ? AppView.StudentIdScan : AppView.AdminKey);
    };

    const handleStudentDetailsSubmit = (studentDetails: Omit<Student, 'location' | 'isInsideBoundary' | 'isRealUser'>) => {
        const newStudent: Student = { ...studentDetails, location: null, isInsideBoundary: true, isRealUser: true };
        setCurrentUser(newStudent);
        setStudents(prev => [...prev.filter(s => s.id !== newStudent.id), newStudent]);
        setCurrentView(AppView.LocationAccess);
    };
    
    const handleLocationAccess = () => {
        if (!currentUser) return;
        navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // For demo purposes, we scale the real geo-coordinates to our mock map (0-100)
                // This is a very rough approximation.
                const scaledLocation = {
                    latitude: ((latitude - Math.floor(latitude)) * 10000) % 100,
                    longitude: ((longitude - Math.floor(longitude)) * 10000) % 100,
                };

                setStudents(prev => prev.map(s => s.id === currentUser.id ? { ...s, location: scaledLocation } : s));
            },
            (error) => {
                console.error("Geolocation Error:", error);
                alert("Could not access your location. Please enable location services in your browser settings.");
            },
            { enableHighAccuracy: true }
        );
    };
    
    const handleAdminKeySuccess = () => setCurrentView(AppView.AdminDashboard);
    const handleEditBoundary = () => setCurrentView(AppView.EditBoundary);
    const handleSaveBoundary = (newBoundary: GeofencePoint[]) => {
        setBoundary(newBoundary);
        setCurrentView(AppView.AdminDashboard);
    };

    const resetToHome = () => setCurrentView(AppView.UserSelection);

    const renderView = () => {
        switch (currentView) {
            case AppView.Login:
                return <LoginPage onLogin={handleLogin} />;
            case AppView.UserSelection:
                return <UserSelectionPage onSelect={handleSelectUserType} />;
            case AppView.StudentIdScan:
                return <StudentIdScanPage onSubmit={handleStudentDetailsSubmit} />;
            case AppView.LocationAccess:
                return <LocationAccessPage onAccessGranted={handleLocationAccess} />;
            case AppView.AdminKey:
                return <AdminKeyPage onSuccess={handleAdminKeySuccess} />;
            case AppView.AdminDashboard:
                return <AdminDashboard students={students} boundary={boundary} alerts={alerts} setAlerts={setAlerts} onEditBoundary={handleEditBoundary} onLogout={resetToHome} />;
            case AppView.EditBoundary:
                return <EditBoundaryPage currentBoundary={boundary} onSave={handleSaveBoundary} onCancel={() => setCurrentView(AppView.AdminDashboard)} />;
            default:
                return <LoginPage onLogin={handleLogin} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {renderView()}
        </div>
    );
}
