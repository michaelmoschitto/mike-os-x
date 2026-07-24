FROM ubuntu:22.04@sha256:0e0a0fc6d18feda9db1590da249ac93e8d5abfea8f4c3c0c849ce512b5ef8982

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

RUN apt-get update && apt-get install -y \
    bash \
    zsh \
    git \
    vim \
    nano \
    curl \
    wget \
    htop \
    tree \
    jq \
    python3 \
    python3-pip \
    nodejs \
    npm \
    unzip \
    locales \
    fonts-powerline \
    && rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8

RUN useradd -m -d /workspace -s /bin/zsh -u 1000 workspace && \
    rm -rf /home/workspace || true

WORKDIR /workspace

USER root

ARG OH_MY_ZSH_COMMIT=e1d1f0dcd53d87096e5bfa48cb1c30d37cb7e5bf
ARG ZSH_AUTOSUGGESTIONS_COMMIT=85919cd1ffa7d2d5412f6d3fe437ebdbeeec4fc5
ARG ZSH_SYNTAX_HIGHLIGHTING_COMMIT=1d85c692615a25fe2293bdd44b34c217d5d2bf04
ARG FZF_COMMIT=235a726fae89bec3ac6d3e7facd2716d78bb625d

RUN git init /opt/oh-my-zsh && \
    git -C /opt/oh-my-zsh remote add origin https://github.com/ohmyzsh/ohmyzsh.git && \
    git -C /opt/oh-my-zsh fetch --depth 1 origin "$OH_MY_ZSH_COMMIT" && \
    git -C /opt/oh-my-zsh checkout --detach FETCH_HEAD && \
    git init /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions remote add origin https://github.com/zsh-users/zsh-autosuggestions.git && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions fetch --depth 1 origin "$ZSH_AUTOSUGGESTIONS_COMMIT" && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions checkout --detach FETCH_HEAD && \
    git init /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting remote add origin https://github.com/zsh-users/zsh-syntax-highlighting.git && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting fetch --depth 1 origin "$ZSH_SYNTAX_HIGHLIGHTING_COMMIT" && \
    git -C /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting checkout --detach FETCH_HEAD && \
    git init /opt/fzf && \
    git -C /opt/fzf remote add origin https://github.com/junegunn/fzf.git && \
    git -C /opt/fzf fetch --depth 1 origin "$FZF_COMMIT" && \
    git -C /opt/fzf checkout --detach FETCH_HEAD && \
    cd /opt/fzf && \
    ./install --all --no-bash --no-fish && \
    rm -rf /opt/oh-my-zsh/.git \
      /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions/.git \
      /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting/.git \
      /opt/fzf/.git && \
    chown -R workspace:workspace /opt/oh-my-zsh /opt/fzf

RUN echo 'export ZSH="$HOME/.oh-my-zsh"' > /opt/zshrc-template && \
    echo 'ZSH_THEME="random"' >> /opt/zshrc-template && \
    echo 'plugins=(git fzf zsh-autosuggestions zsh-syntax-highlighting)' >> /opt/zshrc-template && \
    echo 'source $ZSH/oh-my-zsh.sh' >> /opt/zshrc-template && \
    echo '[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh' >> /opt/zshrc-template

USER root

RUN echo '#!/bin/bash' > /entrypoint.sh && \
    echo 'if [ ! -d /workspace/.oh-my-zsh ]; then' >> /entrypoint.sh && \
    echo '  cp -r /opt/oh-my-zsh /workspace/.oh-my-zsh' >> /entrypoint.sh && \
    echo '  chown -R workspace:workspace /workspace/.oh-my-zsh' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'if [ ! -d /workspace/.fzf ]; then' >> /entrypoint.sh && \
    echo '  cp -r /opt/fzf /workspace/.fzf' >> /entrypoint.sh && \
    echo '  chown -R workspace:workspace /workspace/.fzf' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'if [ ! -f /workspace/.zshrc ]; then' >> /entrypoint.sh && \
    echo '  cp /opt/zshrc-template /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  chown workspace:workspace /workspace/.zshrc' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["tail", "-f", "/dev/null"]

