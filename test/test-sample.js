/**
 * 🧪 NOX Test Sample Code
 * Use this file to test NOX's AI capabilities
 */

// Test 1: Simple function for explanation
function calculateFactorial(n) {
    if (n <= 1) return 1;
    return n * calculateFactorial(n - 1);
}

// Test 2: Code that needs refactoring
function processUserData(users) {
    var result = [];
    for (var i = 0; i < users.length; i++) {
        if (users[i].age > 18) {
            if (users[i].status == 'active') {
                result.push({
                    name: users[i].name,
                    email: users[i].email,
                    age: users[i].age
                });
            }
        }
    }
    return result;
}

// Test 3: Complex algorithm for analysis
class DataProcessor {
    constructor(data) {
        this.data = data;
        this.cache = new Map();
    }

    process() {
        const results = [];
        for (const item of this.data) {
            if (this.cache.has(item.id)) {
                results.push(this.cache.get(item.id));
            } else {
                const processed = this.complexCalculation(item);
                this.cache.set(item.id, processed);
                results.push(processed);
            }
        }
        return results;
    }

    complexCalculation(item) {
        // Simulate complex processing
        let result = 0;
        for (let i = 0; i < item.value; i++) {
            result += Math.sqrt(i) * Math.log(i + 1);
        }
        return {
            id: item.id,
            processed: result,
            timestamp: Date.now()
        };
    }
}

// Test 4: Async function with error handling
async function fetchUserProfile(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
    }
}

// Test 5: React component (if testing with React)
function UserCard({ user, onEdit, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    
    const handleSave = (updatedUser) => {
        onEdit(updatedUser);
        setIsEditing(false);
    };

    return (
        <div className="user-card">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <div className="actions">
                <button onClick={() => setIsEditing(true)}>Edit</button>
                <button onClick={() => onDelete(user.id)}>Delete</button>
            </div>
        </div>
    );
}

module.exports = {
    calculateFactorial,
    processUserData,
    DataProcessor,
    fetchUserProfile,
    UserCard
};
