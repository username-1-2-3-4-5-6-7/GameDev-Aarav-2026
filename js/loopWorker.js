function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let i = 0;

async function run() {
  let i = 0;

  while (true) {
    await sleep(1);

    i++;
    self.postMessage(i);
  }
}

run();
