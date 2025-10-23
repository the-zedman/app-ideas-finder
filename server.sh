#!/bin/bash

# App Ideas Finder - Development Server Manager
# Usage: ./server.sh [start|stop|restart|status]

PORT=3001

start_server() {
    echo "Starting development server on port $PORT..."
    
    # Check if server is already running
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "⚠️  Server is already running on port $PORT"
        return 1
    fi
    
    # Start the server in the background
    npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    
    echo "✅ Server started with PID $SERVER_PID"
    echo "🌐 Local:   http://localhost:$PORT"
    echo "📝 Logs:    tail -f server.log"
}

stop_server() {
    echo "Stopping development server on port $PORT..."
    
    # Find and kill processes on port 3001
    PIDS=$(lsof -ti:$PORT)
    
    if [ -z "$PIDS" ]; then
        echo "ℹ️  No server running on port $PORT"
        return 0
    fi
    
    # Kill the processes
    echo "$PIDS" | xargs kill -9
    
    echo "✅ Server stopped"
}

restart_server() {
    echo "Restarting development server..."
    stop_server
    sleep 2
    start_server
}

status_server() {
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo "❌ Server is not running on port $PORT"
        return 1
    else
        echo "✅ Server is running on port $PORT"
        echo "📊 Process IDs: $PIDS"
        echo "🌐 URL: http://localhost:$PORT"
        return 0
    fi
}

# Main script logic
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    *)
        echo "App Ideas Finder - Development Server Manager"
        echo ""
        echo "Usage: ./server.sh [start|stop|restart|status]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the development server"
        echo "  stop     - Stop the development server"
        echo "  restart  - Restart the development server"
        echo "  status   - Check if server is running"
        echo ""
        echo "Examples:"
        echo "  ./server.sh start"
        echo "  ./server.sh stop"
        echo "  ./server.sh restart"
        echo "  ./server.sh status"
        exit 1
        ;;
esac

