# Bridge Service Testing Guide

## ✅ All Features Implemented

This guide covers testing the bridge service with the new monitoring and test mode features.

## 🧪 Test Mode

Test mode simulates blockchain events without needing a real connection. Perfect for development and testing!

### Running in Test Mode

```bash
# Set TEST_MODE=true in your .env
TEST_MODE=true

# Or run directly:
TEST_MODE=true yarn dev

# Or use the dedicated script:
yarn dev:test
```

### What Happens in Test Mode

- Mock `StrategyPurchased` events are generated every 10 seconds
- First event fires immediately on startup
- No real blockchain connection required
- Perfect for testing order execution logic

### Expected Output

```
2025-10-22T19:33:34.607Z [INFO] main - 🧪 TEST MODE ENABLED
2025-10-22T19:33:34.631Z [INFO] api-server - API server listening on http://0.0.0.0:3001
2025-10-22T19:33:34.631Z [INFO] event-monitor - Starting event monitor in TEST MODE
2025-10-22T19:33:34.632Z [INFO] event-monitor - 🧪 MOCK StrategyPurchased event detected
```

## 📊 Monitoring Endpoints

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T19:33:37.190Z",
  "service": "polyhedge-bridge",
  "version": "0.1.0"
}
```

### 2. Monitor Status (Full Details)
```bash
curl http://localhost:3001/api/monitor/status
```

Response:
```json
{
  "isRunning": true,
  "shouldStop": false,
  "testMode": true,
  "stats": {
    "eventsProcessed": 0,
    "eventsDetected": 3,
    "errorCount": 3,
    "currentBlock": 3,
    "startTime": "2025-10-22T19:33:34.631Z",
    "lastEventTime": "2025-10-22T19:33:58.061Z",
    "lastErrorTime": "2025-10-22T19:34:00.789Z",
    "uptime": 32,
    "uptimeFormatted": "32s"
  },
  "config": {
    "strategyManager": "0x0000000000000000000000000000000000000001",
    "startBlock": 0,
    "pollIntervalMs": 5000
  }
}
```

### 3. Stats Only (Lightweight)
```bash
curl http://localhost:3001/api/monitor/stats
```

Response:
```json
{
  "isRunning": true,
  "testMode": true,
  "stats": {
    "eventsDetected": 3,
    "eventsProcessed": 0,
    "errorCount": 3,
    "uptime": 32,
    "uptimeFormatted": "32s"
  },
  "timestamp": "2025-10-22T19:34:06.764Z"
}
```

## 🧪 Running Unit Tests

### Install Test Dependencies

Already installed via `yarn install` at root level.

### Run Tests

```bash
# Run all tests once
yarn test

# Watch mode (re-runs on file changes)
yarn test:watch

# With coverage report
yarn test:coverage
```

### Test Structure

```
src/__tests__/
├── event-monitor.test.ts   # Worker unit tests
├── server.test.ts          # API endpoint tests
└── integration.test.ts     # Full integration tests
```

### Example Test Output

```bash
✓ src/__tests__/event-monitor.test.ts (8)
  ✓ EventMonitorWorker (8)
    ✓ initialization (2)
      ✓ should initialize with correct config
      ✓ should track initial stats
    ✓ status reporting (2)
      ✓ should return comprehensive status
      ✓ should calculate uptime
    ✓ test mode (2)
      ✓ should enable test mode
      ✓ should start in test mode
    ✓ lifecycle (2)
      ✓ should prevent double start
      ✓ should stop cleanly

Test Files  3 passed (3)
     Tests  12 passed (12)
```

## 🔍 Monitoring in Production

### Health Check for Load Balancers

```bash
# Returns 200 OK when healthy
curl -f http://localhost:3001/health || echo "Service down!"
```

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 30
```

### Monitoring Dashboard Integration

```bash
# Poll stats every 30 seconds
watch -n 30 'curl -s http://localhost:3001/api/monitor/stats | jq'
```

### Alert on Errors

```bash
# Check if error count is increasing
ERROR_COUNT=$(curl -s http://localhost:3001/api/monitor/stats | jq '.stats.errorCount')
if [ "$ERROR_COUNT" -gt 10 ]; then
  echo "ALERT: High error count: $ERROR_COUNT"
fi
```

## 🐛 Debugging

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug

# Then run
yarn dev
```

### Common Issues & Solutions

#### ❌ Port Already in Use

```bash
# Find and kill process on port 3001
lsof -ti :3001 | xargs kill -9

# Or use a different port
PORT=3002 yarn dev
```

#### ❌ Events Not Detected

Check:
1. Is `TEST_MODE=true` for testing?
2. Is `STRATEGY_MANAGER_ADDRESS` correct?
3. Is HyperSync endpoint reachable?
4. Are there actual events to detect?

```bash
# Check HyperSync connection
curl -X POST $HYPERSYNC_ENDPOINT -H "Content-Type: application/json" -d '{
  "fromBlock": 0,
  "toBlock": 100,
  "logs": []
}'
```

#### ❌ High Error Count

Check logs for specific errors:
```bash
# Filter for errors
yarn dev 2>&1 | grep ERROR
```

Common causes:
- Invalid Polymarket credentials
- Network connectivity issues
- Strategy not found in config
- Market IDs don't exist

## 📈 Performance Testing

### Load Testing Stats Endpoint

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/monitor/stats

# Using hey
hey -n 1000 -c 10 http://localhost:3001/api/monitor/stats
```

### Memory Usage

```bash
# Check memory usage
ps aux | grep "tsx src/index.ts"

# Or use Node.js built-in
node --expose-gc --max-old-space-size=512 dist/index.js
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run bridge tests
  run: |
    cd packages/bridge
    yarn test

- name: Start service in test mode
  run: |
    cd packages/bridge
    TEST_MODE=true yarn dev &
    sleep 5
    
- name: Health check
  run: |
    curl -f http://localhost:3001/health
    
- name: Check monitoring
  run: |
    curl -s http://localhost:3001/api/monitor/status | jq -e '.isRunning == true'
```

## 📊 Metrics to Track

### Key Performance Indicators

1. **Events Detected** - Total blockchain events found
2. **Events Processed** - Successfully executed strategies
3. **Error Count** - Failed executions (should be low)
4. **Uptime** - Service availability
5. **Response Time** - API endpoint latency

### Sample Metrics Collection Script

```bash
#!/bin/bash
# metrics-collector.sh

while true; do
  STATS=$(curl -s http://localhost:3001/api/monitor/stats)
  
  DETECTED=$(echo $STATS | jq '.stats.eventsDetected')
  PROCESSED=$(echo $STATS | jq '.stats.eventsProcessed')
  ERRORS=$(echo $STATS | jq '.stats.errorCount')
  UPTIME=$(echo $STATS | jq '.stats.uptime')
  
  echo "$(date) | Detected: $DETECTED | Processed: $PROCESSED | Errors: $ERRORS | Uptime: ${UPTIME}s"
  
  sleep 60
done
```

## 🎯 Testing Checklist

Before deploying to production:

- [ ] Unit tests pass (`yarn test`)
- [ ] Service starts without errors
- [ ] Health endpoint returns 200
- [ ] Monitor status shows isRunning=true
- [ ] Test mode works correctly
- [ ] Real mode connects to blockchain
- [ ] Events are detected and logged
- [ ] Strategy execution attempts orders
- [ ] Error handling works (check error count)
- [ ] Graceful shutdown works (Ctrl+C)
- [ ] Service restarts automatically after crash

## 🚀 Quick Start Testing

```bash
# 1. Install dependencies
yarn install

# 2. Run tests
cd packages/bridge
yarn test

# 3. Start in test mode
yarn dev:test

# 4. In another terminal, test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/monitor/status | jq

# 5. Watch for mock events (every 10s)
tail -f /tmp/bridge-demo.log | grep "MOCK"

# 6. Stop service
Ctrl+C
```

## 📚 Additional Resources

- **Implementation Guide**: `IMPLEMENTATION_GUIDE.md`
- **README**: `README.md`
- **API Documentation**: See server.ts for all endpoints
- **Test Examples**: See `src/__tests__/` directory

Happy Testing! 🎉

