import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";

import { useAuth } from "./context/AuthContext";

function App() {

    const { user } = useAuth();

    return (
        <>
            {user ? <Dashboard /> : <LoginPage />}
        </>
    );
}

export default App;