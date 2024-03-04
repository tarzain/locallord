while true; do node index.js && break || echo "Crashed with error, restarting in 1s..."; sleep 1; done

