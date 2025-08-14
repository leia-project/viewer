export class BackgroundMusic {
    private audioElement: HTMLAudioElement;

    constructor(audioPath: string, loop: boolean) {
        this.audioElement = new Audio(audioPath);
        this.audioElement.loop = loop;
    }

    public playMusic() {
        this.audioElement.play();
        
    }

    public pauseMusic() {
        this.audioElement.pause();
    }
}

