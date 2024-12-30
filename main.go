package main

import (
    "encoding/json"
    "io/ioutil"
    "log"
    "net/http"
    "sync"
    "time"
)

type Note struct {
    ID         string    `json:"id"`
    Title      string    `json:"title"`
    Content    string    `json:"content"`
    Category   string    `json:"category"`
    Tags       []string  `json:"tags"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
    IsPinned   bool      `json:"is_pinned"`
}

type NotesStore struct {
    sync.RWMutex
    notes []Note
}

func (s *NotesStore) saveToFile() error {
    s.RLock()
    defer s.RUnlock()
    
    data, err := json.MarshalIndent(s.notes, "", "  ")
    if err != nil {
        return err
    }
    
    return ioutil.WriteFile("data.json", data, 0644)
}

func (s *NotesStore) loadFromFile() error {
    data, err := ioutil.ReadFile("data.json")
    if err != nil {
        s.notes = []Note{}
        return nil
    }
    
    return json.Unmarshal(data, &s.notes)
}

func main() {
    store := &NotesStore{}
    err := store.loadFromFile()
    if err != nil {
        log.Fatal(err)
    }

    // CORS middleware
    corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
            
            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusOK)
                return
            }
            
            next(w, r)
        }
    }

    // API routes
    http.HandleFunc("/api/notes", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")

        switch r.Method {
        case "GET":
            json.NewEncoder(w).Encode(store.notes)
            
        case "POST":
            var note Note
            if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
            }
            
            note.ID = time.Now().Format("20060102150405")
            note.CreatedAt = time.Now()
            note.UpdatedAt = time.Now()
            
            store.Lock()
            store.notes = append(store.notes, note)
            store.Unlock()
            
            store.saveToFile()
            json.NewEncoder(w).Encode(note)
        }
    }))

    http.HandleFunc("/api/notes/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
        id := r.URL.Path[len("/api/notes/"):]
        w.Header().Set("Content-Type", "application/json")

        switch r.Method {
        case "PUT":
            var updatedNote Note
            if err := json.NewDecoder(r.Body).Decode(&updatedNote); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
            }
            
            store.Lock()
            for i := range store.notes {
                if store.notes[i].ID == id {
                    updatedNote.ID = id
                    updatedNote.CreatedAt = store.notes[i].CreatedAt
                    updatedNote.UpdatedAt = time.Now()
                    store.notes[i] = updatedNote
                    break
                }
            }
            store.Unlock()
            
            store.saveToFile()
            json.NewEncoder(w).Encode(updatedNote)
            
        case "DELETE":
            store.Lock()
            for i := range store.notes {
                if store.notes[i].ID == id {
                    store.notes = append(store.notes[:i], store.notes[i+1:]...)
                    break
                }
            }
            store.Unlock()
            
            store.saveToFile()
            w.WriteHeader(http.StatusNoContent)
        }
    }))

    // Serve static files
    fs := http.FileServer(http.Dir("static"))
    http.Handle("/", fs)

    log.Println("Server starting on :8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}