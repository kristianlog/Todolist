//Funksjon til å legge til nye oppgaver
function addTask() {
    //Få Oppgave input og bilde input
    var input = document.getElementById("taskInput");
    var taskText = input.value.trim();
    var imageInput = document.getElementById("imageInput");
    var image = imageInput.files[0];
    
    //Lag Oppgave Element
    var taskList = document.getElementById("taskList");
    var task = document.createElement("div");
    task.classList.add("task");

    //Legg til oppgave text
    var taskTextElement = document.createElement("div");
    taskTextElement.textContent = taskText;
    task.appendChild(taskTextElement);

    //Legg til bildee knapp hvis bilde er lagt til
    if (image) {
        var imageButton = document.createElement("button");
        imageButton.textContent = "🖼️";
        imageButton.classList.add("delete-button");
        imageButton.addEventListener("click", function() {
            openModal(image);
        });
        task.appendChild(imageButton)
    }

    // Legg til slett knapp
    var deleteButton = document.createElement("button");
    deleteButton.textContent = "Slett";
    deleteButton.classList.add("delete-button");
    deleteButton.addEventListener("click", function(event) {
        var confirmed = confirm("Er du sikker på at du vil slette denne oppgaven?");
        if (confirmed) {
            task.remove(); // Remove the task element from the DOM
            removeTaskFromStorage(taskText); // Remove the task from storage
        }
        event.stopPropagation();
    });
    task.appendChild(deleteButton);

    // Add event listener for task completion
    task.addEventListener("click", function(event) {
        if (event.target.classList.contains("delete-button")) {
            // If the clicked element is the delete button, do nothing
            return;
        } else {
            this.classList.toggle("completed");
            if (this.classList.contains("completed")) {
                moveTaskToCompleted(this);
            } else {
                moveTaskToIncomplete(this);
            }
        }
    });

    // Append task to task list
    taskList.appendChild(task);

    // Reset input fields
    input.value = "";
    imageInput.value = null;

    // Save task to localStorage
    saveTaskToStorage(taskText);
}

// Function to save task to storage
function saveTaskToStorage(taskText) {
    // Retrieve tasks from storage or initialize an empty array
    var tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    // Add the new task to the array
    tasks.push(taskText);

    // Save the tasks array back to localStorage
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Load tasks from localStorage when the page is loaded
function loadTasksFromStorage() {
    var tasks = JSON.parse(localStorage.getItem("tasks"));
    if (tasks) {
        tasks.forEach(function(taskText) {
            addTaskFromStorage(taskText);
        });
    }
}

// Function to add task from storage
function addTaskFromStorage(taskText) {
    var taskList = document.getElementById("taskList");
    var task = document.createElement("div");
    task.classList.add("task");

    var taskTextElement = document.createElement("div");
    taskTextElement.textContent = taskText;
    task.appendChild(taskTextElement);

    var deleteButton = document.createElement("button");
    deleteButton.textContent = "Slett";
    deleteButton.classList.add("delete-button");
    deleteButton.addEventListener("click", function(event) {
        var confirmed = confirm("Er du sikker på at du vil slette denne oppgaven?");
        if (confirmed) {
            task.remove(); // Remove the task element from the DOM
            removeTaskFromStorage(taskText); // Remove the task from storage
        }
        // Prevent the event from propagating further
        event.stopPropagation();
    });
    task.appendChild(deleteButton);

    task.addEventListener("click", function() {
        this.classList.toggle("completed");
        if (this.classList.contains("completed")) {
            moveTaskToCompleted(this);
        } else {
            moveTaskToIncomplete(this);
        }
    });

    taskList.appendChild(task);
}

// Function to load tasks from localStorage when the page is loaded
function loadTasksFromStorage() {
    var tasks = JSON.parse(localStorage.getItem("tasks"));
    if (tasks) {
        tasks.forEach(function(taskText) {
            addTaskFromStorage(taskText); // Call addTaskFromStorage for each task
        });
    }
}

// Call loadTasksFromStorage when the page is loaded
window.addEventListener("load", function() {
    loadTasksFromStorage();
});

// Function to remove task from storage
function removeTaskFromStorage(taskText) {
    // Retrieve tasks from storage
    var tasks = JSON.parse(localStorage.getItem("tasks"));

    // Find index of the task to remove
    var index = tasks.indexOf(taskText);
    if (index !== -1) {
        tasks.splice(index, 1); // Remove the task from the array
        localStorage.setItem("tasks", JSON.stringify(tasks)); // Update storage
    }
}

// Function to move task to completed
function moveTaskToCompleted(taskElement) {
    var completedList = document.getElementById("completedList");
    completedList.appendChild(taskElement);
    // Implement the logic to move the task to the completed list
    // For example, you can change the styling or move it to a different section
}

// Function to move task back to incomplete list
function moveTaskToIncomplete(taskElement) {
    var taskList = document.getElementById("taskList");
    taskList.appendChild(taskElement);
}


